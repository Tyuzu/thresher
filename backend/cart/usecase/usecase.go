package usecase

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"naevis/cart/domain"
	"naevis/config/mqevent"
	"naevis/infra/mq"
	"naevis/models"
	"naevis/utils"
)

const (
	deliveryFee = 2000
	taxRate     = 0.05
)

type CartUseCase struct {
	cartRepo   domain.CartRepository
	itemRepo   domain.ItemRepository
	couponRepo domain.CouponRepository
	orderRepo  domain.OrderRepository
	txnRepo    domain.TransactionRepository
	userRepo   domain.UserRepository
	mq         mq.MQ
}

type CartUsecase = CartUseCase

func NewCartUseCase(
	cartRepo domain.CartRepository,
	itemRepo domain.ItemRepository,
	couponRepo domain.CouponRepository,
	orderRepo domain.OrderRepository,
	txnRepo domain.TransactionRepository,
	userRepo domain.UserRepository,
	mqClient mq.MQ,
) *CartUseCase {
	return &CartUseCase{
		cartRepo:   cartRepo,
		itemRepo:   itemRepo,
		couponRepo: couponRepo,
		orderRepo:  orderRepo,
		txnRepo:    txnRepo,
		userRepo:   userRepo,
		mq:         mqClient,
	}
}

func NewCartUsecase(
	cartRepo domain.CartRepository,
	itemRepo domain.ItemRepository,
	couponRepo domain.CouponRepository,
	orderRepo domain.OrderRepository,
	txnRepo domain.TransactionRepository,
	userRepo domain.UserRepository,
	mqClient mq.MQ,
) *CartUseCase {
	return NewCartUseCase(cartRepo, itemRepo, couponRepo, orderRepo, txnRepo, userRepo, mqClient)
}

func (u *CartUseCase) AddToCart(ctx context.Context, userID string, item models.CartItem) error {
	if item.ItemID == "" || item.Quantity <= 0 {
		return errors.New("invalid item")
	}

	details, err := u.itemRepo.LookupItemDetails(ctx, item.ItemID)
	if err != nil {
		return err
	}
	if item.Quantity > details.Available {
		return errors.New("insufficient stock")
	}

	item.UserID = userID
	item.ItemName = details.Name
	item.ItemType = details.Type
	item.Unit = details.Unit
	item.Price = int64(details.Price * 100)
	item.Discount = int64(details.Discount * 100)
	item.Category = details.Category
	if item.EntityID == "" {
		item.EntityID = details.EntityID
	}
	if item.EntityType == "" {
		item.EntityType = details.EntityType
	}
	item.AddedAt = time.Now()

	if err := u.cartRepo.UpsertCartItem(ctx, userID, item); err != nil {
		return err
	}

	if u.mq != nil {
		_ = u.mq.Publish(ctx, mqevent.CartItemCreatedEvent, []byte(""))
	}
	return nil
}

func (u *CartUseCase) UpdateCart(ctx context.Context, userID string, items []models.CartItem) ([]models.CartItem, error) {
	if len(items) == 0 {
		return nil, errors.New("no items provided")
	}

	docs := make([]any, 0, len(items))
	for _, item := range items {
		if item.ItemID == "" || item.Quantity <= 0 {
			continue
		}

		details, err := u.itemRepo.LookupItemDetails(ctx, item.ItemID)
		if err != nil {
			continue
		}

		qty := item.Quantity
		if qty > details.Available {
			qty = details.Available
		}
		if qty <= 0 {
			continue
		}

		docs = append(docs, models.CartItem{
			UserID:     userID,
			ItemID:     item.ItemID,
			ItemName:   details.Name,
			ItemType:   details.Type,
			Unit:       details.Unit,
			Category:   details.Category,
			Price:      int64(details.Price * 100),
			Quantity:   qty,
			AddedAt:    time.Now(),
			EntityID:   details.EntityID,
			EntityType: details.EntityType,
		})
	}

	if err := u.cartRepo.ReplaceCartItems(ctx, userID, docs); err != nil {
		return nil, err
	}

	updated, err := u.cartRepo.GetCartItems(ctx, userID)
	if err != nil {
		return nil, err
	}

	if u.mq != nil {
		_ = u.mq.Publish(ctx, mqevent.CartItemUpdatedEvent, []byte(""))
	}
	return updated, nil
}

func (u *CartUseCase) UpdateItemQuantity(ctx context.Context, userID, itemID, category string, quantity int, entityID, entityType string) (map[string][]models.CartItem, error) {
	if itemID == "" || category == "" {
		return nil, errors.New("itemId and category are required")
	}
	if quantity <= 0 {
		return nil, errors.New("quantity must be greater than 0")
	}

	details, err := u.itemRepo.LookupItemDetails(ctx, itemID)
	if err != nil {
		return nil, err
	}
	if quantity > details.Available {
		return nil, errors.New("requested quantity exceeds available stock")
	}

	if err := u.cartRepo.UpdateCartItemQuantity(ctx, userID, itemID, category, quantity, entityID, entityType); err != nil {
		return nil, err
	}

	grouped, err := u.groupCartItemsByCategory(userID, "", ctx)
	if err != nil {
		return nil, errors.New("failed to fetch updated cart")
	}

	if u.mq != nil {
		_ = u.mq.Publish(ctx, mqevent.ItemQuantityUpdatedEvent, []byte(""))
	}
	return grouped, nil
}

func (u *CartUseCase) GetCart(ctx context.Context, userID, category string) (map[string][]models.CartItem, error) {
	return u.groupCartItemsByCategory(userID, category, ctx)
}

func (u *CartUseCase) RemoveFromCart(ctx context.Context, userID, itemID, category, entityID, entityType string) (map[string][]models.CartItem, error) {
	if itemID == "" || category == "" {
		return nil, errors.New("itemId and category are required")
	}

	if err := u.cartRepo.DeleteCartItem(ctx, userID, itemID, category, entityID, entityType); err != nil {
		return nil, err
	}

	grouped, err := u.groupCartItemsByCategory(userID, "", ctx)
	if err != nil {
		return nil, err
	}

	if u.mq != nil {
		_ = u.mq.Publish(ctx, mqevent.ItemRemovedFromCartEvent, []byte(""))
	}
	return grouped, nil
}

func (u *CartUseCase) ClearCart(ctx context.Context, userID string) error {
	if err := u.cartRepo.ClearCart(ctx, userID); err != nil {
		return err
	}
	if u.mq != nil {
		_ = u.mq.Publish(ctx, mqevent.CartClearedEvent, []byte(""))
	}
	return nil
}

func (u *CartUseCase) InitiateCheckout(ctx context.Context, userID string) (int, error) {
	items, err := u.cartRepo.GetCartItems(ctx, userID)
	if err != nil {
		return 0, err
	}
	if len(items) == 0 {
		return 0, errors.New("cart is empty")
	}
	if u.mq != nil {
		_ = u.mq.Publish(ctx, mqevent.CheckoutInitiatedEvent, []byte(""))
	}
	return len(items), nil
}

func (u *CartUseCase) CreateCheckoutSession(ctx context.Context, userID string, payload models.CheckoutSession) (map[string]any, error) {
	if payload.Address == "" {
		return nil, errors.New("address required")
	}

	allItems := u.flattenCartItems(payload.Items)
	if len(allItems) == 0 {
		return nil, errors.New("no items provided")
	}

	validatedItems, subtotal, itemDiscountTotal, err := u.validateAndPriceItems(ctx, allItems)
	if err != nil {
		return nil, err
	}

	discount := u.calculateTotalDiscount(ctx, payload.PaymentMethod, subtotal, itemDiscountTotal)
	totalAfterDiscount := subtotal - discount
	if totalAfterDiscount < 0 {
		totalAfterDiscount = 0
	}

	tax := int64(float64(totalAfterDiscount) * taxRate)
	total := totalAfterDiscount + tax + deliveryFee

	session := map[string]any{
		"items":     validatedItems,
		"subtotal":  subtotal,
		"discount":  discount,
		"tax":       tax,
		"delivery":  deliveryFee,
		"total":     total,
		"address":   payload.Address,
		"createdAt": time.Now(),
	}

	if u.mq != nil {
		_ = u.mq.Publish(ctx, mqevent.CheckoutSessionCreatedEvent, []byte(""))
	}

	return session, nil
}

func (u *CartUseCase) PlaceOrder(ctx context.Context, userID string, payload models.CheckoutSession, couponCode string) (map[string]any, error) {
	if payload.Address == "" {
		return nil, errors.New("address is required")
	}
	if len(payload.Items) == 0 {
		return nil, errors.New("no items in checkout")
	}

	allItems := u.flattenCartItems(payload.Items)
	if len(allItems) == 0 {
		return nil, errors.New("no items in checkout")
	}

	validatedGroupedItems, subtotal, itemDiscountTotal, err := u.validateAndPriceItems(ctx, allItems)
	if err != nil {
		return nil, err
	}

	discount := itemDiscountTotal
	if couponCode != "" {
		couponRes, err := u.couponRepo.ValidateCoupon(ctx, couponCode, subtotal)
		if err == nil && couponRes != nil {
			discount += couponRes.DiscountAmount
		}
	}

	totalAfterDiscount := subtotal - discount
	if totalAfterDiscount < 0 {
		totalAfterDiscount = 0
	}

	tax := int64(float64(totalAfterDiscount) * taxRate)
	delivery := int64(deliveryFee)
	total := totalAfterDiscount + tax + delivery

	checkout := models.CheckoutSession{
		UserID:        userID,
		Address:       payload.Address,
		PaymentMethod: payload.PaymentMethod,
		Items:         validatedGroupedItems,
		Subtotal:      subtotal,
		Discount:      discount,
		Tax:           tax,
		Delivery:      delivery,
		Total:         total,
	}

	farmOrders, err := u.processFarmOrders(ctx, checkout)
	if err != nil {
		return nil, err
	}

	genOrder, err := u.processGeneralOrders(ctx, checkout)
	if err != nil {
		return nil, err
	}

	if err := u.cartRepo.ClearCart(ctx, userID); err != nil {
		return nil, err
	}

	if u.mq != nil {
		_ = u.mq.Publish(ctx, mqevent.OrderPlacedEvent, []byte(""))
	}

	resp := map[string]any{"success": true, "farmOrders": farmOrders}
	if genOrder != nil {
		resp["order"] = genOrder
	}
	return resp, nil
}

func (u *CartUseCase) GetMyOrders(ctx context.Context, userID string, skip, limit int) (map[string]any, error) {
	regularOrders, farmOrders, err := u.orderRepo.FetchUserOrders(ctx, userID)
	if err != nil {
		return nil, err
	}

	allOrders := make([]map[string]any, 0, len(regularOrders)+len(farmOrders))

	for _, order := range regularOrders {
		allOrders = append(allOrders, map[string]any{
			"orderId":       order.OrderID,
			"orderType":     "regular",
			"userId":        order.UserID,
			"items":         order.Items,
			"address":       order.Address,
			"paymentMethod": order.PaymentMethod,
			"total":         order.Total,
			"status":        order.Status,
			"createdAt":     order.CreatedAt,
			"approvedBy":    order.ApprovedBy,
		})
	}

	orderIDs, approverIDSet := u.extractFarmOrderMetadata(farmOrders)
	txnByOrder, err := u.txnRepo.FindTransactionsByOrderIDs(ctx, orderIDs)
	if err != nil {
		return nil, err
	}

	userNameMap, err := u.userRepo.FindUsersByIDs(ctx, approverIDSet)
	if err != nil {
		return nil, err
	}

	for _, order := range farmOrders {
		pm := u.mapPaymentStatus(order.Status)
		if txn, ok := txnByOrder[order.OrderID]; ok {
			pm = u.mapPaymentStatusFromTxn(&txn, order.Status)
		}

		resolvedApprovedBy := make([]string, 0, len(order.ApprovedBy))
		for _, approverID := range order.ApprovedBy {
			if approverID == "" {
				continue
			}
			if name, found := userNameMap[approverID]; found {
				resolvedApprovedBy = append(resolvedApprovedBy, name)
			} else {
				resolvedApprovedBy = append(resolvedApprovedBy, approverID)
			}
		}

		allOrders = append(allOrders, map[string]any{
			"orderId":       order.OrderID,
			"orderType":     "farm",
			"userId":        order.UserID,
			"farmId":        order.FarmID,
			"items":         order.Items,
			"address":       order.Address,
			"paymentMethod": pm,
			"total":         int64(order.PriceAtPurchase * 100),
			"status":        string(order.Status),
			"createdAt":     order.CreatedAt,
			"approvedBy":    resolvedApprovedBy,
		})
	}

	sort.Slice(allOrders, func(i, j int) bool {
		return allOrders[i]["createdAt"].(time.Time).After(allOrders[j]["createdAt"].(time.Time))
	})

	total := len(allOrders)
	if skip < 0 {
		skip = 0
	}
	if limit <= 0 {
		limit = 10
	}
	if skip > total {
		skip = total
	}
	end := skip + limit
	if end > total {
		end = total
	}

	return map[string]any{
		"orders": allOrders[skip:end],
		"total":  total,
		"skip":   skip,
		"limit":  limit,
	}, nil
}

func (u *CartUseCase) ValidateCouponForEntity(ctx context.Context, code, entityID, entityType string) (domain.Coupon, error) {
	return u.couponRepo.FindCouponForEntity(ctx, code, entityID, entityType)
}

func (u *CartUseCase) ValidateCouponCode(ctx context.Context, code string, subtotal int64) (int64, error) {
	result, err := u.couponRepo.ValidateCoupon(ctx, code, subtotal)
	if err != nil {
		return 0, err
	}
	return result.DiscountAmount, nil
}

func (u *CartUseCase) groupCartItemsByCategory(userID, category string, ctx context.Context) (map[string][]models.CartItem, error) {
	items, err := u.cartRepo.GetCartItems(ctx, userID)
	if err != nil {
		return nil, err
	}

	grouped := make(map[string][]models.CartItem)
	for _, item := range items {
		if category != "" && item.Category != category {
			continue
		}
		grouped[item.Category] = append(grouped[item.Category], item)
	}
	return grouped, nil
}

func (u *CartUseCase) flattenCartItems(groupedItems map[string][]models.CartItem) []models.CartItem {
	totalCapacity := 0
	for _, items := range groupedItems {
		totalCapacity += len(items)
	}

	allItems := make([]models.CartItem, 0, totalCapacity)
	for _, items := range groupedItems {
		allItems = append(allItems, items...)
	}
	return allItems
}

func (u *CartUseCase) validateAndPriceItems(ctx context.Context, items []models.CartItem) (map[string][]models.CartItem, int64, int64, error) {
	validatedItems := make(map[string][]models.CartItem)
	var subtotal, itemDiscountTotal int64

	for _, item := range items {
		if item.ItemID == "" || item.Quantity <= 0 {
			continue
		}

		details, err := u.itemRepo.LookupItemDetails(ctx, item.ItemID)
		if err != nil {
			return nil, 0, 0, err
		}
		if item.Quantity > details.Available {
			return nil, 0, 0, fmt.Errorf("requested quantity of %s exceeds available stock", details.Name)
		}

		price := int64(details.Price * 100)
		itemDiscount := int64(details.Discount * 100)
		subtotal += price * int64(item.Quantity)
		itemDiscountTotal += itemDiscount * int64(item.Quantity)

		validatedItems[details.Category] = append(validatedItems[details.Category], models.CartItem{
			ItemID:     item.ItemID,
			ItemName:   details.Name,
			Quantity:   item.Quantity,
			Price:      price,
			Category:   details.Category,
			EntityID:   details.EntityID,
			EntityType: details.EntityType,
		})
	}

	return validatedItems, subtotal, itemDiscountTotal, nil
}

func (u *CartUseCase) calculateTotalDiscount(ctx context.Context, couponCode string, subtotal, itemDiscountTotal int64) int64 {
	discount := itemDiscountTotal
	if couponCode == "" {
		return discount
	}

	couponRes, err := u.couponRepo.ValidateCoupon(ctx, couponCode, subtotal)
	if err != nil {
		return discount
	}
	if couponRes != nil {
		discount += couponRes.DiscountAmount
	}
	return discount
}

func (u *CartUseCase) processFarmOrders(ctx context.Context, checkout models.CheckoutSession) ([]models.FarmOrder, error) {
	cropItems, ok := checkout.Items["crops"]
	if !ok || len(cropItems) == 0 {
		return nil, nil
	}

	user, err := u.userRepo.FindUserByID(ctx, checkout.UserID)
	var userName, userPhone string
	if err == nil {
		userName = user.Name
		userPhone = user.PhoneNumber
	}

	grouped := make(map[string][]models.CartItem)
	for _, item := range cropItems {
		if item.EntityType == "farm" {
			grouped[item.EntityID] = append(grouped[item.EntityID], item)
		}
	}

	orders := make([]models.FarmOrder, 0, len(grouped))
	for farmID, items := range grouped {
		var farmSubtotal int64
		var totalQty int

		for _, item := range items {
			farmSubtotal += item.Price * int64(item.Quantity)
			totalQty += item.Quantity
		}

		var discount, tax, delivery int64
		if checkout.Subtotal > 0 {
			ratio := float64(farmSubtotal) / float64(checkout.Subtotal)
			discount = int64(float64(checkout.Discount) * ratio)
			tax = int64(float64(checkout.Tax) * ratio)
			delivery = int64(float64(checkout.Delivery) * ratio)
		}

		farmTotal := farmSubtotal - discount + tax + delivery
		genID, _ := utils.GenerateRandomString(9)
		order := models.FarmOrder{
			OrderID:         "ORD" + genID,
			UserID:          checkout.UserID,
			FarmID:          farmID,
			Name:            userName,
			Phone:           userPhone,
			Status:          "pending",
			ApprovedBy:      []string{},
			Items:           map[string][]models.CartItem{"crops": items},
			CreatedAt:       time.Now(),
			Quantity:        totalQty,
			PriceAtPurchase: float64(farmSubtotal) / 100,
			Address:         checkout.Address,
			Subtotal:        farmSubtotal,
			Discount:        discount,
			Tax:             tax,
			Delivery:        delivery,
			Total:           farmTotal,
		}
		if len(items) > 0 {
			order.CropID = items[0].ItemID
		}

		if err := u.orderRepo.CreateFarmOrder(ctx, order); err != nil {
			return nil, err
		}
		orders = append(orders, order)
	}

	return orders, nil
}

func (u *CartUseCase) processGeneralOrders(ctx context.Context, checkout models.CheckoutSession) (*models.Order, error) {
	nonCropItems := make(map[string][]models.CartItem)
	for category, items := range checkout.Items {
		if category == "crops" {
			continue
		}
		if len(items) > 0 {
			nonCropItems[category] = items
		}
	}
	if len(nonCropItems) == 0 {
		return nil, nil
	}

	genID, _ := utils.GenerateRandomString(9)
	order := models.Order{
		OrderID:       "ORD" + genID,
		UserID:        checkout.UserID,
		Items:         nonCropItems,
		Address:       checkout.Address,
		PaymentMethod: checkout.PaymentMethod,
		Subtotal:      checkout.Subtotal,
		Discount:      checkout.Discount,
		Tax:           checkout.Tax,
		Delivery:      checkout.Delivery,
		Total:         checkout.Total,
		Status:        "pending",
		ApprovedBy:    []string{},
		CreatedAt:     time.Now(),
	}
	if err := u.orderRepo.CreateOrder(ctx, order); err != nil {
		return nil, err
	}
	return &order, nil
}

func (u *CartUseCase) extractFarmOrderMetadata(farmOrders []models.FarmOrder) ([]string, []string) {
	orderIDs := make([]string, 0, len(farmOrders))
	approverIDs := make([]string, 0)
	seen := make(map[string]struct{})
	for _, o := range farmOrders {
		orderIDs = append(orderIDs, o.OrderID)
		for _, id := range o.ApprovedBy {
			if id != "" {
				if _, ok := seen[id]; !ok {
					seen[id] = struct{}{}
					approverIDs = append(approverIDs, id)
				}
			}
		}
	}
	return orderIDs, approverIDs
}

func (u *CartUseCase) mapPaymentStatus(status models.OrderStatus) string {
	switch string(status) {
	case "paid", "delivered":
		return "paid"
	case "rejected":
		return "unpaid"
	default:
		return "pending"
	}
}

func (u *CartUseCase) mapPaymentStatusFromTxn(txn *models.Transaction, status models.OrderStatus) string {
	if txn == nil {
		return u.mapPaymentStatus(status)
	}
	if strings.EqualFold(txn.Status, "success") {
		return "paid"
	}
	if strings.EqualFold(txn.Method, "cod") {
		return "pending"
	}
	return u.mapPaymentStatus(status)
}
