package cart

import (
	"context"
	"errors"

	"naevis/config"
	"naevis/infra"
	"naevis/models"

	"go.mongodb.org/mongo-driver/bson"
)

var (
	cartCollection       = config.Collections.CartCollection
	couponCollection     = config.Collections.CouponCollection
	farmOrdersCollection = config.Collections.FarmOrdersCollection
	ordersCollection     = config.Collections.OrderCollection
)

func getCartItemsFromDB(ctx context.Context, userID string, app *infra.Deps) ([]models.CartItem, error) {
	var items []models.CartItem
	err := app.DB.FindMany(ctx, cartCollection, bson.M{"userId": userID}, &items)
	if err != nil {
		return nil, err
	}
	return items, nil
}

func replaceCartItemsInDB(ctx context.Context, userID string, docs []any, app *infra.Deps) error {
	if _, err := app.DB.Delete(ctx, cartCollection, bson.M{"userId": userID}); err != nil {
		return err
	}
	if len(docs) == 0 {
		return nil
	}
	return app.DB.InsertMany(ctx, cartCollection, docs)
}

func upsertCartItemInDB(ctx context.Context, userID string, item models.CartItem, app *infra.Deps) error {
	filter := bson.M{"userId": userID, "itemId": item.ItemID}
	if item.EntityID != "" {
		filter["entityId"] = item.EntityID
	}
	if item.EntityType != "" {
		filter["entityType"] = item.EntityType
	}

	update := bson.M{
		"$inc": bson.M{"quantity": item.Quantity},
		"$set": bson.M{
			"price":      item.Price,
			"itemName":   item.ItemName,
			"itemType":   item.ItemType,
			"unit":       item.Unit,
			"category":   item.Category,
			"entityId":   item.EntityID,
			"entityType": item.EntityType,
		},
		"$setOnInsert": bson.M{"addedAt": item.AddedAt},
	}

	return app.DB.Upsert(ctx, cartCollection, filter, update)
}

func updateCartItemQuantityInDB(
	ctx context.Context,
	userID string,
	itemID string,
	category string,
	quantity int,
	entityID string,
	entityType string,
	app *infra.Deps,
) error {
	filter := bson.M{"userId": userID, "itemId": itemID, "category": category}
	if entityID != "" {
		filter["entityId"] = entityID
	}
	if entityType != "" {
		filter["entityType"] = entityType
	}

	update := bson.M{"$set": bson.M{"quantity": quantity}}
	return app.DB.Update(ctx, cartCollection, filter, update)
}

func deleteCartItemFromDB(
	ctx context.Context,
	userID string,
	itemID string,
	category string,
	entityID string,
	entityType string,
	app *infra.Deps,
) error {
	filter := bson.M{"userId": userID, "itemId": itemID, "category": category}
	if entityID != "" {
		filter["entityId"] = entityID
	}
	if entityType != "" {
		filter["entityType"] = entityType
	}
	_, err := app.DB.Delete(ctx, cartCollection, filter)
	return err
}

func clearCartForUser(ctx context.Context, userID string, app *infra.Deps) error {
	_, err := app.DB.Delete(ctx, cartCollection, bson.M{"userId": userID})
	return err
}

func getGroupedCart(
	ctx context.Context,
	userID string,
	category string,
	app *infra.Deps,
) (map[string][]models.CartItem, error) {
	items, err := getCartItemsFromDB(ctx, userID, app)
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

func fetchUserOrdersFromDB(ctx context.Context, userID string, app *infra.Deps) ([]models.Order, []models.FarmOrder, error) {
	regularOrders := make([]models.Order, 0)
	if err := app.DB.FindMany(ctx, ordersCollection, bson.M{"userId": userID}, &regularOrders); err != nil {
		return nil, nil, err
	}

	farmOrders := make([]models.FarmOrder, 0)
	if err := app.DB.FindMany(ctx, farmOrdersCollection, bson.M{"userid": userID}, &farmOrders); err != nil {
		return regularOrders, nil, nil
	}

	return regularOrders, farmOrders, nil
}

type ItemDetails struct {
	Name       string
	Type       string
	Category   string
	Price      float64
	Discount   float64
	Unit       string
	EntityID   string
	EntityName string
	EntityType string
	Available  int
}

func lookupItemDetails(ctx context.Context, itemID string, app *infra.Deps) (*ItemDetails, error) {
	crop, err := lookupCrop(ctx, itemID, app)
	if err == nil && crop != nil {
		return crop, nil
	}

	product, err := lookupProduct(ctx, itemID, app)
	if err == nil && product != nil {
		return product, nil
	}

	menu, err := lookupMenu(ctx, itemID, app)
	if err == nil && menu != nil {
		return menu, nil
	}

	merch, err := lookupMerchandise(ctx, itemID, app)
	if err == nil && merch != nil {
		return merch, nil
	}

	return nil, errors.New("item not found in any collection")
}

func lookupProduct(ctx context.Context, productID string, app *infra.Deps) (*ItemDetails, error) {
	var product struct {
		Name     string  `bson:"name"`
		Type     string  `bson:"type"`
		Price    float64 `bson:"price"`
		Discount float64 `bson:"discount"`
		Unit     string  `bson:"unit"`
		Quantity int     `bson:"quantity"`
	}

	err := app.DB.FindOne(ctx, "products", bson.M{"productid": productID}, &product)
	if err != nil {
		return nil, err
	}
	if product.Quantity <= 0 {
		return nil, errors.New("product out of stock")
	}

	return &ItemDetails{
		Name:       product.Name,
		Type:       product.Type,
		Category:   "products",
		Price:      product.Price,
		Discount:   product.Discount,
		Unit:       product.Unit,
		EntityID:   "",
		EntityName: "",
		EntityType: "",
		Available:  product.Quantity,
	}, nil
}

func lookupCrop(ctx context.Context, cropID string, app *infra.Deps) (*ItemDetails, error) {
	var crop struct {
		CropID       string  `bson:"cropid"`
		Name         string  `bson:"name"`
		Breed        string  `bson:"breed"`
		Price        float64 `bson:"price"`
		Discount     float64 `bson:"discount"`
		AvailableQty int     `bson:"quantity"`
		FarmID       string  `bson:"farmid"`
		FarmName     string  `bson:"farmName"`
	}

	err := app.DB.FindOne(ctx, "crops", bson.M{"cropid": cropID}, &crop)
	if err != nil {
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
		if err := app.DB.FindOne(ctx, "farms", bson.M{"farmid": crop.FarmID}, &farm); err == nil {
			farmName = farm.Name
		}
	}

	return &ItemDetails{
		Name:       crop.Name,
		Type:       crop.Breed,
		Category:   "crops",
		Price:      crop.Price,
		Discount:   crop.Discount,
		Unit:       "kg",
		EntityID:   crop.FarmID,
		EntityName: farmName,
		EntityType: "farm",
		Available:  crop.AvailableQty,
	}, nil
}

func lookupMenu(ctx context.Context, menuID string, app *infra.Deps) (*ItemDetails, error) {
	var menu struct {
		MenuID   string  `bson:"menuid"`
		Name     string  `bson:"name"`
		Price    float64 `bson:"price"`
		Discount float64 `bson:"discount"`
		Stock    int     `bson:"stock"`
		PlaceID  string  `bson:"placeid"`
		Place    string  `bson:"place"`
	}

	err := app.DB.FindOne(ctx, "menu", bson.M{"menuid": menuID}, &menu)
	if err != nil {
		return nil, err
	}
	if menu.Stock <= 0 {
		return nil, errors.New("menu item out of stock")
	}

	return &ItemDetails{
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

func lookupMerchandise(ctx context.Context, merchID string, app *infra.Deps) (*ItemDetails, error) {
	var merch struct {
		MerchID  string  `bson:"merchid"`
		Name     string  `bson:"name"`
		Price    float64 `bson:"price"`
		Discount float64 `bson:"discount"`
		Stock    int     `bson:"stock"`
	}

	err := app.DB.FindOne(ctx, "merchandise", bson.M{"merchid": merchID}, &merch)
	if err != nil {
		return nil, err
	}
	if merch.Stock <= 0 {
		return nil, errors.New("merchandise out of stock")
	}

	return &ItemDetails{
		Name:       merch.Name,
		Type:       "merchandise",
		Category:   "merchandise",
		Price:      merch.Price,
		Discount:   merch.Discount,
		Unit:       "unit",
		EntityID:   "",
		EntityName: "",
		EntityType: "",
		Available:  merch.Stock,
	}, nil
}
