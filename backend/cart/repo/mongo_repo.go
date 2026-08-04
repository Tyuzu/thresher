package repo

import (
	"context"
	"errors"
	"strings"
	"time"

	"naevis/cart/domain"
	"naevis/config"
	db "naevis/infra/db"
	"naevis/models"

	"go.mongodb.org/mongo-driver/bson"
)

type MongoCartRepo struct {
	db db.Database
}

func NewMongoRepo(d db.Database) *MongoCartRepo {
	return &MongoCartRepo{db: d}
}

var (
	cartCollection       = config.Collections.CartCollection
	couponCollection     = config.Collections.CouponCollection
	farmOrdersCollection = config.Collections.FarmOrdersCollection
	ordersCollection     = config.Collections.OrderCollection
)

func (m *MongoCartRepo) GetCartItems(ctx context.Context, userID string) ([]models.CartItem, error) {
	var items []models.CartItem
	if err := m.db.FindMany(ctx, cartCollection, bson.M{"userid": userID}, &items); err != nil {
		return nil, err
	}
	return items, nil
}

func (m *MongoCartRepo) ReplaceCartItems(ctx context.Context, userID string, docs []any) error {
	if _, err := m.db.Delete(ctx, cartCollection, bson.M{"userid": userID}); err != nil {
		return err
	}
	if len(docs) == 0 {
		return nil
	}
	return m.db.InsertMany(ctx, cartCollection, docs)
}

func (m *MongoCartRepo) UpsertCartItem(ctx context.Context, userID string, item models.CartItem) error {
	filter := buildCartFilter(userID, item.ItemID, item.Category, item.EntityID, item.EntityType)
	update := bson.M{
		"$inc": bson.M{"quantity": item.Quantity},
		"$set": bson.M{
			"price":      item.Price,
			"itemname":   item.ItemName,
			"itemtype":   item.ItemType,
			"unit":       item.Unit,
			"category":   item.Category,
			"entityid":   item.EntityID,
			"entitytype": item.EntityType,
		},
		"$setOnInsert": bson.M{"addedat": item.AddedAt},
	}
	return m.db.Upsert(ctx, cartCollection, filter, update)
}

func (m *MongoCartRepo) UpdateCartItemQuantity(ctx context.Context, userID, itemID, category string, quantity int, entityID, entityType string) error {
	filter := buildCartFilter(userID, itemID, category, entityID, entityType)
	return m.db.Update(ctx, cartCollection, filter, bson.M{"$set": bson.M{"quantity": quantity}})
}

func (m *MongoCartRepo) DeleteCartItem(ctx context.Context, userID, itemID, category, entityID, entityType string) error {
	filter := buildCartFilter(userID, itemID, category, entityID, entityType)
	_, err := m.db.Delete(ctx, cartCollection, filter)
	return err
}

func (m *MongoCartRepo) ClearCart(ctx context.Context, userID string) error {
	_, err := m.db.Delete(ctx, cartCollection, bson.M{"userid": userID})
	return err
}

func (m *MongoCartRepo) FetchUserOrders(ctx context.Context, userID string) ([]models.Order, []models.FarmOrder, error) {
	regularOrders := make([]models.Order, 0)
	if err := m.db.FindMany(ctx, ordersCollection, bson.M{"userid": userID}, &regularOrders); err != nil {
		return nil, nil, err
	}

	farmOrders := make([]models.FarmOrder, 0)
	if err := m.db.FindMany(ctx, farmOrdersCollection, bson.M{"userid": userID}, &farmOrders); err != nil {
		return regularOrders, nil, nil
	}

	return regularOrders, farmOrders, nil
}

func (m *MongoCartRepo) CreateOrder(ctx context.Context, order models.Order) error {
	return m.db.Insert(ctx, ordersCollection, order)
}

func (m *MongoCartRepo) CreateFarmOrder(ctx context.Context, order models.FarmOrder) error {
	return m.db.Insert(ctx, farmOrdersCollection, order)
}

func (m *MongoCartRepo) FindTransactionsByOrderIDs(ctx context.Context, orderIDs []string) (map[string]models.Transaction, error) {
	txnMap := make(map[string]models.Transaction)
	if len(orderIDs) == 0 {
		return txnMap, nil
	}

	var txns []models.Transaction
	if err := m.db.FindMany(ctx, "transactions", bson.M{"entitytype": "order", "entityid": bson.M{"$in": orderIDs}}, &txns); err != nil {
		return txnMap, err
	}

	for _, txn := range txns {
		if txn.EntityID != "" {
			txnMap[txn.EntityID] = txn
		}
	}
	return txnMap, nil
}

func (m *MongoCartRepo) FindUsersByIDs(ctx context.Context, ids []string) (map[string]string, error) {
	nameMap := make(map[string]string)
	if len(ids) == 0 {
		return nameMap, nil
	}

	var users []models.User
	if err := m.db.FindMany(ctx, "users", bson.M{"userid": bson.M{"$in": ids}}, &users); err != nil {
		return nameMap, err
	}

	for _, u := range users {
		if u.Name != "" {
			nameMap[u.UserID] = u.Name
		}
	}

	return nameMap, nil
}

func (m *MongoCartRepo) FindUserByID(ctx context.Context, userID string) (models.User, error) {
	var user models.User
	if err := m.db.FindOne(ctx, "users", bson.M{"userid": userID}, &user); err != nil {
		return models.User{}, err
	}
	return user, nil
}

func (m *MongoCartRepo) LookupItemDetails(ctx context.Context, itemID string) (*domain.ItemDetails, error) {
	lookups := []func(context.Context, string) (*domain.ItemDetails, error){
		m.lookupCrop,
		m.lookupProduct,
		m.lookupMenu,
		m.lookupMerchandise,
	}

	for _, lookup := range lookups {
		if details, err := lookup(ctx, itemID); err == nil && details != nil {
			return details, nil
		}
	}

	return nil, errors.New("item not found in any collection")
}

func (m *MongoCartRepo) ValidateCoupon(ctx context.Context, code string, subtotal int64) (*domain.CouponResult, error) {
	code = strings.TrimSpace(strings.ToLower(code))
	if code == "" {
		return &domain.CouponResult{DiscountAmount: 0}, nil
	}

	var coupon dbCoupon
	if err := m.db.FindOne(ctx, couponCollection, bson.M{"code": code}, &coupon); err != nil || !coupon.Active {
		return nil, errors.New("invalid coupon")
	}

	if coupon.ExpiresAt > 0 && time.Now().Unix() > coupon.ExpiresAt {
		return nil, errors.New("coupon expired")
	}

	var discount int64
	switch strings.ToLower(coupon.Type) {
	case "flat":
		discount = int64(coupon.Value * 100)
	case "percent":
		raw := float64(subtotal) * (coupon.Value / 100)
		discount = int64(raw)
		if coupon.MaxDiscount > 0 {
			max := int64(coupon.MaxDiscount * 100)
			if discount > max {
				discount = max
			}
		}
	default:
		return nil, errors.New("unsupported coupon type")
	}

	if discount > subtotal {
		discount = subtotal
	}

	return &domain.CouponResult{DiscountAmount: discount}, nil
}

func (m *MongoCartRepo) FindCouponForEntity(ctx context.Context, code, entityID, entityType string) (domain.Coupon, error) {
	code = strings.TrimSpace(strings.ToLower(code))
	entityType = strings.TrimSpace(strings.ToLower(entityType))

	var coupon dbCoupon
	if err := m.db.FindOne(ctx, couponCollection, bson.M{
		"code":       code,
		"entityid":   entityID,
		"entitytype": entityType,
		"active":     true,
	}, &coupon); err != nil {
		return domain.Coupon{}, errors.New("coupon not valid for this entity")
	}

	if coupon.ExpiresAt > 0 && time.Now().Unix() > coupon.ExpiresAt {
		return domain.Coupon{}, errors.New("coupon expired")
	}

	return domain.Coupon{
		Code:        coupon.Code,
		Type:        coupon.Type,
		Value:       coupon.Value,
		MaxDiscount: coupon.MaxDiscount,
		ExpiresAt:   coupon.ExpiresAt,
		Active:      coupon.Active,
		EntityID:    coupon.EntityID,
		EntityType:  coupon.EntityType,
	}, nil
}

func (m *MongoCartRepo) lookupProduct(ctx context.Context, productID string) (*domain.ItemDetails, error) {
	var product struct {
		ProductID string  `bson:"productid"`
		Name      string  `bson:"name"`
		Type      string  `bson:"type"`
		Category  string  `bson:"category"`
		Price     float64 `bson:"price"`
		Discount  float64 `bson:"discount"`
		Unit      string  `bson:"unit"`
		Quantity  int     `bson:"quantity"`
		UserID    string  `bson:"userid"`
	}

	if err := m.db.FindOne(ctx, "products", bson.M{"productid": productID}, &product); err != nil {
		return nil, err
	}
	if product.Quantity <= 0 {
		return nil, errors.New("product out of stock")
	}

	category := product.Category
	if category == "" {
		category = "products"
	}

	return &domain.ItemDetails{
		Name:       product.Name,
		Type:       product.Type,
		Category:   category,
		Price:      product.Price,
		Discount:   product.Discount,
		Unit:       product.Unit,
		EntityID:   product.UserID,
		EntityType: "vendor",
		Available:  product.Quantity,
	}, nil
}

func (m *MongoCartRepo) lookupCrop(ctx context.Context, cropID string) (*domain.ItemDetails, error) {
	var crop struct {
		CropID       string  `bson:"cropid"`
		Name         string  `bson:"name"`
		Category     string  `bson:"category"`
		Price        float64 `bson:"price"`
		Discount     float64 `bson:"discount"`
		AvailableQty int     `bson:"quantity"`
		Unit         string  `bson:"unit"`
		FarmID       string  `bson:"farmid"`
		FarmName     string  `bson:"farmname"`
	}

	if err := m.db.FindOne(ctx, "crops", bson.M{"cropid": cropID}, &crop); err != nil {
		return nil, err
	}
	if crop.AvailableQty <= 0 {
		return nil, errors.New("crop out of stock")
	}

	farmName := crop.FarmName
	if farmName == "" && crop.FarmID != "" {
		var farm struct {
			Name string `bson:"name"`
		}
		if err := m.db.FindOne(ctx, "farms", bson.M{"farmid": crop.FarmID}, &farm); err == nil {
			farmName = farm.Name
		}
	}

	unit := crop.Unit
	if unit == "" {
		unit = "kg"
	}

	return &domain.ItemDetails{
		Name:       crop.Name,
		Type:       crop.Category,
		Category:   "crops",
		Price:      crop.Price,
		Discount:   crop.Discount,
		Unit:       unit,
		EntityID:   crop.FarmID,
		EntityName: farmName,
		EntityType: "farm",
		Available:  crop.AvailableQty,
	}, nil
}

func (m *MongoCartRepo) lookupMenu(ctx context.Context, menuID string) (*domain.ItemDetails, error) {
	var menu struct {
		MenuID   string  `bson:"menuid"`
		Name     string  `bson:"name"`
		Price    float64 `bson:"price"`
		Discount float64 `bson:"discount"`
		Stock    int     `bson:"stock"`
		PlaceID  string  `bson:"placeid"`
		Place    string  `bson:"place"`
	}

	if err := m.db.FindOne(ctx, "menu", bson.M{"menuid": menuID}, &menu); err != nil {
		return nil, err
	}
	if menu.Stock <= 0 {
		return nil, errors.New("menu item out of stock")
	}

	return &domain.ItemDetails{
		Name:       menu.Name,
		Type:       "menu",
		Category:   "menu",
		Price:      menu.Price,
		Discount:   menu.Discount,
		Unit:       "unit",
		EntityID:   menu.PlaceID,
		EntityName: menu.Place,
		EntityType: "place",
		Available:  menu.Stock,
	}, nil
}

func (m *MongoCartRepo) lookupMerchandise(ctx context.Context, merchID string) (*domain.ItemDetails, error) {
	var merch struct {
		MerchID  string  `bson:"merchid"`
		Name     string  `bson:"name"`
		Price    float64 `bson:"price"`
		Discount float64 `bson:"discount"`
		Stock    int     `bson:"stock"`
	}

	if err := m.db.FindOne(ctx, "merchandise", bson.M{"merchid": merchID}, &merch); err != nil {
		return nil, err
	}
	if merch.Stock <= 0 {
		return nil, errors.New("merchandise out of stock")
	}

	return &domain.ItemDetails{
		Name:       merch.Name,
		Type:       "merchandise",
		Category:   "merchandise",
		Price:      merch.Price,
		Discount:   merch.Discount,
		Unit:       "unit",
		EntityType: "merchandise",
		Available:  merch.Stock,
	}, nil
}

func buildCartFilter(userID, itemID, category, entityID, entityType string) bson.M {
	filter := bson.M{"userid": userID, "itemid": itemID}
	if category != "" {
		filter["category"] = category
	}
	if entityID != "" {
		filter["entityid"] = entityID
	}
	if entityType != "" {
		filter["entitytype"] = entityType
	}
	return filter
}

type dbCoupon struct {
	Code        string  `bson:"code"`
	Active      bool    `bson:"active"`
	ExpiresAt   int64   `bson:"expiresat"`
	Type        string  `bson:"type"`
	Value       float64 `bson:"value"`
	MaxDiscount float64 `bson:"maxdiscount"`
	EntityID    string  `bson:"entityid"`
	EntityType  string  `bson:"entitytype"`
}
