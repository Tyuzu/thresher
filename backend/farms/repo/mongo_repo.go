package repo

import (
	"context"

	"naevis/config"
	"naevis/farms/domain"
	db "naevis/infra/db"
	"naevis/models"

	"go.mongodb.org/mongo-driver/bson"
)

type MongoFarmsRepo struct {
	db db.Database
}

func NewMongoRepo(d db.Database) domain.FarmsRepository {
	return &MongoFarmsRepo{db: d}
}

func (m *MongoFarmsRepo) CreateFarm(ctx context.Context, f models.Farm) error {
	return m.db.InsertOne(ctx, config.Collections.FarmsCollection, f)
}

func (m *MongoFarmsRepo) GetFarmByID(ctx context.Context, farmID string) (models.Farm, error) {
	var farm models.Farm
	if err := m.db.FindOne(ctx, config.Collections.FarmsCollection, bson.M{"farmid": farmID}, &farm); err != nil {
		return models.Farm{}, err
	}
	return farm, nil
}

func (m *MongoFarmsRepo) UpdateFarm(ctx context.Context, farmID, userID string, update any) error {
	return m.db.UpdateOne(ctx, config.Collections.FarmsCollection, bson.M{"farmid": farmID, "userid": userID}, update)
}

func (m *MongoFarmsRepo) DeleteFarm(ctx context.Context, farmID string) (int64, error) {
	return m.db.DeleteOne(ctx, config.Collections.FarmsCollection, bson.M{"farmid": farmID})
}

// crops
func (m *MongoFarmsRepo) FindCrops(ctx context.Context, filter any) ([]models.Crop, error) {
	var crops []models.Crop
	err := m.db.FindMany(ctx, config.Collections.CropsCollection, filter, &crops)
	return crops, err
}

func (m *MongoFarmsRepo) FindCatalogue(ctx context.Context) ([]models.CropCatalogueItem, error) {
	var items []models.CropCatalogueItem
	err := m.db.FindMany(ctx, config.Collections.CatalogueCollection, bson.M{}, &items)
	return items, err
}

func (m *MongoFarmsRepo) FindAllCrops(ctx context.Context) ([]models.Crop, error) {
	var crops []models.Crop
	err := m.db.FindMany(ctx, config.Collections.CropsCollection, bson.M{}, &crops)
	return crops, err
}

// crop about
func (m *MongoFarmsRepo) CreateCropAbout(ctx context.Context, c models.CropAbout) error {
	return m.db.InsertOne(ctx, config.Collections.CropsAboutCollection, c)
}

func (m *MongoFarmsRepo) GetCropAbout(ctx context.Context, id string) (*models.CropAbout, error) {
	var crop models.CropAbout
	if err := m.db.FindOne(ctx, config.Collections.CropsAboutCollection, bson.M{"id": id}, &crop); err != nil {
		return nil, err
	}
	return &crop, nil
}

func (m *MongoFarmsRepo) GetAllCropAbouts(ctx context.Context) ([]models.CropAbout, error) {
	var crops []models.CropAbout
	err := m.db.FindMany(ctx, config.Collections.CropsAboutCollection, bson.M{}, &crops)
	return crops, err
}

func (m *MongoFarmsRepo) UpdateCropAbout(ctx context.Context, id string, c models.CropAbout) error {
	return m.db.UpdateOne(ctx, config.Collections.CropsAboutCollection, bson.M{"id": id}, bson.M{"$set": c})
}

func (m *MongoFarmsRepo) DeleteCropAbout(ctx context.Context, id string) error {
	_, err := m.db.DeleteOne(ctx, config.Collections.CropsAboutCollection, bson.M{"id": id})
	return err
}

// crop CRUD
func (m *MongoFarmsRepo) InsertCrop(ctx context.Context, c models.Crop) error {
	return m.db.InsertOne(ctx, config.Collections.CropsCollection, c)
}

func (m *MongoFarmsRepo) UpdateCrop(ctx context.Context, cropID string, update any) error {
	return m.db.UpdateOne(ctx, config.Collections.CropsCollection, bson.M{"cropid": cropID}, update)
}

func (m *MongoFarmsRepo) DeleteCrop(ctx context.Context, cropID string) error {
	_, err := m.db.DeleteOne(ctx, config.Collections.CropsCollection, bson.M{"cropid": cropID})
	return err
}

// products
func (m *MongoFarmsRepo) FindProductsWithOptions(ctx context.Context, filter any, opts db.FindManyOptions) ([]models.Product, error) {
	var items []models.Product
	err := m.db.FindManyWithOptions(ctx, config.Collections.ProductCollection, filter, opts, &items)
	return items, err
}

func (m *MongoFarmsRepo) CountProducts(ctx context.Context, filter any) (int64, error) {
	return m.db.CountDocuments(ctx, config.Collections.ProductCollection, filter)
}

func (m *MongoFarmsRepo) InsertProduct(ctx context.Context, p models.Product) error {
	return m.db.InsertOne(ctx, config.Collections.ProductCollection, p)
}

func (m *MongoFarmsRepo) GetProductByID(ctx context.Context, id string, out *models.Product) error {
	return m.db.FindOne(ctx, config.Collections.ProductCollection, bson.M{"productid": id}, out)
}

func (m *MongoFarmsRepo) UpdateProduct(ctx context.Context, id string, update any) error {
	return m.db.UpdateOne(ctx, config.Collections.ProductCollection, bson.M{"productid": id}, update)
}

func (m *MongoFarmsRepo) DeleteProduct(ctx context.Context, id string) error {
	_, err := m.db.DeleteOne(ctx, config.Collections.ProductCollection, bson.M{"productid": id})
	return err
}

// farms
func (m *MongoFarmsRepo) FindFarms(ctx context.Context, filter any) ([]models.Farm, error) {
	var farms []models.Farm
	err := m.db.FindMany(ctx, config.Collections.FarmsCollection, filter, &farms)
	return farms, err
}

func (m *MongoFarmsRepo) AggregateFarms(ctx context.Context, pipeline []any, out any) error {
	return m.db.Aggregate(ctx, config.Collections.FarmsCollection, pipeline, out)
}

func (m *MongoFarmsRepo) CountFarms(ctx context.Context, filter any) (int64, error) {
	return m.db.CountDocuments(ctx, config.Collections.FarmsCollection, filter)
}

// farm orders
func (m *MongoFarmsRepo) FindFarmOrders(ctx context.Context, filter any) ([]models.FarmOrder, error) {
	var orders []models.FarmOrder
	err := m.db.FindMany(ctx, config.Collections.FarmOrdersCollection, filter, &orders)
	return orders, err
}

func (m *MongoFarmsRepo) GetOrderByID(ctx context.Context, orderID string) (models.FarmOrder, error) {
	var order models.FarmOrder
	if err := m.db.FindOne(ctx, config.Collections.FarmOrdersCollection, bson.M{"orderid": orderID}, &order); err != nil {
		return models.FarmOrder{}, err
	}
	return order, nil
}

func (m *MongoFarmsRepo) UpdateFarmOrder(ctx context.Context, orderID string, update any) error {
	return m.db.UpdateOne(ctx, config.Collections.FarmOrdersCollection, bson.M{"orderid": orderID}, update)
}

func (m *MongoFarmsRepo) GetUserByID(ctx context.Context, id string) (models.User, error) {
	var user models.User
	if err := m.db.FindOne(ctx, config.Collections.UserCollection, bson.M{"userid": id}, &user); err != nil {
		return models.User{}, err
	}
	return user, nil
}

func (m *MongoFarmsRepo) GetCropByID(ctx context.Context, id string) (models.Crop, error) {
	var crop models.Crop
	if err := m.db.FindOne(ctx, config.Collections.CropsCollection, bson.M{"cropid": id}, &crop); err != nil {
		return models.Crop{}, err
	}
	return crop, nil
}

func (m *MongoFarmsRepo) FindTransactions(ctx context.Context, filter any) ([]models.Transaction, error) {
	var txns []models.Transaction
	err := m.db.FindMany(ctx, config.Collections.TransactionCollection, filter, &txns)
	return txns, err
}

func (m *MongoFarmsRepo) FindOneAndUpdateCrop(ctx context.Context, farmID, cropID string, update any, result any) error {
	return m.db.FindOneAndUpdate(ctx, config.Collections.CropsCollection, bson.M{"farmid": farmID, "cropid": cropID, "quantity": bson.M{"$gt": 0}, "outofstock": false}, update, result)
}
