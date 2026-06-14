package farms

import (
	"context"
	"naevis/infra"
	"naevis/models"

	"go.mongodb.org/mongo-driver/bson"
)

func CreateCropAbout(
	ctx context.Context,
	app *infra.Deps,
	crop *models.CropAbout,
) error {
	return app.DB.InsertOne(
		ctx,
		cropsAboutCollection,
		crop,
	)
}

func GetCropAbout(
	ctx context.Context,
	app *infra.Deps,
	cropID string,
) (*models.CropAbout, error) {

	var crop models.CropAbout

	err := app.DB.FindOne(
		ctx,
		cropsAboutCollection,
		bson.M{"id": cropID},
		&crop,
	)

	if err != nil {
		return nil, err
	}

	return &crop, nil
}

func GetAllCropAbouts(
	ctx context.Context,
	app *infra.Deps,
) ([]models.CropAbout, error) {

	var crops []models.CropAbout

	err := app.DB.FindMany(
		ctx,
		cropsAboutCollection,
		bson.M{},
		&crops,
	)

	return crops, err
}

func UpdateCropAbout(
	ctx context.Context,
	app *infra.Deps,
	cropID string,
	crop *models.CropAbout,
) error {

	return app.DB.UpdateOne(
		ctx,
		cropsAboutCollection,
		bson.M{"id": cropID},
		bson.M{
			"$set": crop,
		},
	)
}

func DeleteCropAbout(
	ctx context.Context,
	app *infra.Deps,
	cropID string,
) error {

	_, err := app.DB.DeleteOne(
		ctx,
		cropsAboutCollection,
		bson.M{"id": cropID},
	)

	return err
}
