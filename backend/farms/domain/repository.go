package domain

import (
	"context"

	db "naevis/infra/db"
	"naevis/models"
)

// FarmsRepository defines persistence operations needed by farms usecases.
type FarmsRepository interface {
	CreateFarm(ctx context.Context, f models.Farm) error
	GetFarmByID(ctx context.Context, farmID string) (models.Farm, error)
	UpdateFarm(ctx context.Context, farmID, userID string, update any) error
	DeleteFarm(ctx context.Context, farmID string) (int64, error)

	// crops
	FindCrops(ctx context.Context, filter any) ([]models.Crop, error)
	FindCatalogue(ctx context.Context) ([]models.CropCatalogueItem, error)
	FindAllCrops(ctx context.Context) ([]models.Crop, error)

	// crop about
	CreateCropAbout(ctx context.Context, c models.CropAbout) error
	GetCropAbout(ctx context.Context, id string) (*models.CropAbout, error)
	GetAllCropAbouts(ctx context.Context) ([]models.CropAbout, error)
	UpdateCropAbout(ctx context.Context, id string, c models.CropAbout) error
	DeleteCropAbout(ctx context.Context, id string) error

	// crop CRUD
	InsertCrop(ctx context.Context, c models.Crop) error
	UpdateCrop(ctx context.Context, cropID string, update any) error
	DeleteCrop(ctx context.Context, cropID string) error

	// products
	FindProductsWithOptions(ctx context.Context, filter any, opts db.FindManyOptions) ([]models.Product, error)
	CountProducts(ctx context.Context, filter any) (int64, error)

	InsertProduct(ctx context.Context, p models.Product) error
	GetProductByID(ctx context.Context, id string, out *models.Product) error
	UpdateProduct(ctx context.Context, id string, update any) error
	DeleteProduct(ctx context.Context, id string) error

	// farms
	FindFarms(ctx context.Context, filter any) ([]models.Farm, error)
	AggregateFarms(ctx context.Context, pipeline []any, out any) error
	CountFarms(ctx context.Context, filter any) (int64, error)

	// farm orders
	FindFarmOrders(ctx context.Context, filter any) ([]models.FarmOrder, error)
	GetOrderByID(ctx context.Context, orderID string) (models.FarmOrder, error)
	UpdateFarmOrder(ctx context.Context, orderID string, update any) error

	// lookup
	GetUserByID(ctx context.Context, id string) (models.User, error)
	GetCropByID(ctx context.Context, id string) (models.Crop, error)
	FindTransactions(ctx context.Context, filter any) ([]models.Transaction, error)
	FindOneAndUpdateCrop(ctx context.Context, farmID, cropID string, update any, result any) error
}
