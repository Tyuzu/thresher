package usecase

import (
	"context"
	"time"

	"naevis/farms/domain"
	db "naevis/infra/db"
	"naevis/models"

	"go.mongodb.org/mongo-driver/bson"
)

type FarmsUsecase struct {
	repo domain.FarmsRepository
}

func NewFarmsUsecase(r domain.FarmsRepository) *FarmsUsecase {
	return &FarmsUsecase{repo: r}
}

func (u *FarmsUsecase) CreateFarm(ctx context.Context, f models.Farm) error {
	return u.repo.CreateFarm(ctx, f)
}

func (u *FarmsUsecase) GetFarmByID(ctx context.Context, id string) (models.Farm, error) {
	return u.repo.GetFarmByID(ctx, id)
}

func (u *FarmsUsecase) UpdateFarm(ctx context.Context, farmID, userID string, update any) error {
	return u.repo.UpdateFarm(ctx, farmID, userID, update)
}

func (u *FarmsUsecase) DeleteFarm(ctx context.Context, farmID string) (int64, error) {
	return u.repo.DeleteFarm(ctx, farmID)
}

// crops
func (u *FarmsUsecase) FindCrops(ctx context.Context, filter any) ([]models.Crop, error) {
	return u.repo.FindCrops(ctx, filter)
}

func (u *FarmsUsecase) FindCatalogue(ctx context.Context) ([]models.CropCatalogueItem, error) {
	return u.repo.FindCatalogue(ctx)
}

func (u *FarmsUsecase) FindAllCrops(ctx context.Context) ([]models.Crop, error) {
	return u.repo.FindAllCrops(ctx)
}

// crop about
func (u *FarmsUsecase) CreateCropAbout(ctx context.Context, c models.CropAbout) error {
	return u.repo.CreateCropAbout(ctx, c)
}

func (u *FarmsUsecase) GetCropAbout(ctx context.Context, id string) (*models.CropAbout, error) {
	return u.repo.GetCropAbout(ctx, id)
}

func (u *FarmsUsecase) GetAllCropAbouts(ctx context.Context) ([]models.CropAbout, error) {
	return u.repo.GetAllCropAbouts(ctx)
}

func (u *FarmsUsecase) UpdateCropAbout(ctx context.Context, id string, c models.CropAbout) error {
	return u.repo.UpdateCropAbout(ctx, id, c)
}

func (u *FarmsUsecase) DeleteCropAbout(ctx context.Context, id string) error {
	return u.repo.DeleteCropAbout(ctx, id)
}

// crop CRUD
func (u *FarmsUsecase) InsertCrop(ctx context.Context, c models.Crop) error {
	return u.repo.InsertCrop(ctx, c)
}

func (u *FarmsUsecase) UpdateCrop(ctx context.Context, cropID string, update any) error {
	return u.repo.UpdateCrop(ctx, cropID, update)
}

func (u *FarmsUsecase) DecrementCropQuantity(ctx context.Context, farmID, cropID string) (bson.M, error) {
	result := bson.M{}
	err := u.repo.FindOneAndUpdateCrop(ctx, farmID, cropID, bson.M{
		"$inc": bson.M{"quantity": -1},
		"$set": bson.M{"updatedat": time.Now()},
	}, &result)
	return result, err
}

func (u *FarmsUsecase) DeleteCrop(ctx context.Context, cropID string) error {
	return u.repo.DeleteCrop(ctx, cropID)
}

// products
func (u *FarmsUsecase) FindProductsWithOptions(ctx context.Context, filter any, opts db.FindManyOptions) ([]models.Product, error) {
	return u.repo.FindProductsWithOptions(ctx, filter, opts)
}

func (u *FarmsUsecase) CountProducts(ctx context.Context, filter any) (int64, error) {
	return u.repo.CountProducts(ctx, filter)
}

func (u *FarmsUsecase) InsertProduct(ctx context.Context, p models.Product) error {
	return u.repo.InsertProduct(ctx, p)
}

func (u *FarmsUsecase) GetProductByID(ctx context.Context, id string, out *models.Product) error {
	return u.repo.GetProductByID(ctx, id, out)
}

func (u *FarmsUsecase) UpdateProduct(ctx context.Context, id string, update any) error {
	return u.repo.UpdateProduct(ctx, id, update)
}

func (u *FarmsUsecase) DeleteProduct(ctx context.Context, id string) error {
	return u.repo.DeleteProduct(ctx, id)
}

func (u *FarmsUsecase) FindFarms(ctx context.Context, filter any) ([]models.Farm, error) {
	return u.repo.FindFarms(ctx, filter)
}

func (u *FarmsUsecase) AggregateFarms(ctx context.Context, pipeline []any, out any) error {
	return u.repo.AggregateFarms(ctx, pipeline, out)
}

func (u *FarmsUsecase) CountFarms(ctx context.Context, filter any) (int64, error) {
	return u.repo.CountFarms(ctx, filter)
}

func (u *FarmsUsecase) FindFarmOrders(ctx context.Context, filter any) ([]models.FarmOrder, error) {
	return u.repo.FindFarmOrders(ctx, filter)
}

func (u *FarmsUsecase) GetOrderByID(ctx context.Context, id string) (models.FarmOrder, error) {
	return u.repo.GetOrderByID(ctx, id)
}

func (u *FarmsUsecase) UpdateFarmOrder(ctx context.Context, orderID string, update any) error {
	return u.repo.UpdateFarmOrder(ctx, orderID, update)
}

func (u *FarmsUsecase) GetUserByID(ctx context.Context, id string) (models.User, error) {
	return u.repo.GetUserByID(ctx, id)
}

func (u *FarmsUsecase) GetCropByID(ctx context.Context, id string) (models.Crop, error) {
	return u.repo.GetCropByID(ctx, id)
}

func (u *FarmsUsecase) FindTransactions(ctx context.Context, filter any) ([]models.Transaction, error) {
	return u.repo.FindTransactions(ctx, filter)
}

func (u *FarmsUsecase) FindOneAndUpdateCrop(ctx context.Context, farmID, cropID string, update any, result any) error {
	return u.repo.FindOneAndUpdateCrop(ctx, farmID, cropID, update, result)
}
