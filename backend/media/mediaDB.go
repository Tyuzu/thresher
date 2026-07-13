package media

import (
	"context"

	"naevis/config"
	"naevis/infra"
	"naevis/models"

	"go.mongodb.org/mongo-driver/bson"
)

var mediaCollection = config.Collections.MediaCollection

func insertMedia(ctx context.Context, app *infra.Deps, media models.Media) error {
	return app.DB.Insert(ctx, mediaCollection, media)
}

func getMediaByID(ctx context.Context, app *infra.Deps, entityType, entityID, mediaID string) (models.Media, error) {
	var media models.Media
	err := app.DB.FindOne(ctx, mediaCollection, bson.M{
		"entityid":   entityID,
		"entitytype": entityType,
		"mediaid":    mediaID,
	}, &media)
	return media, err
}

func listMediaByEntity(ctx context.Context, app *infra.Deps, entityType, entityID string) ([]models.Media, error) {
	filter := bson.M{
		"entityid":   entityID,
		"entitytype": entityType,
	}

	var medias []models.Media
	err := app.DB.FindMany(ctx, mediaCollection, filter, &medias)
	return medias, err
}

func getMediaGroupsByEntity(ctx context.Context, app *infra.Deps, entityType, entityID string) ([]map[string]any, error) {
	medias, err := listMediaByEntity(ctx, app, entityType, entityID)
	if err != nil {
		return nil, err
	}

	mediaMap := make(map[string][]models.Media)
	for _, media := range medias {
		mediaMap[media.MediaGroupID] = append(mediaMap[media.MediaGroupID], media)
	}

	groups := make([]map[string]any, 0, len(mediaMap))
	for groupID, files := range mediaMap {
		groups = append(groups, map[string]any{
			"groupId": groupID,
			"files":   files,
		})
	}

	return groups, nil
}

func updateMediaGroup(ctx context.Context, app *infra.Deps, mediaGroupID string, updateFields bson.M) ([]models.Media, error) {
	if err := app.DB.UpdateMany(ctx, mediaCollection, bson.M{"mediaGroupId": mediaGroupID}, bson.M{"$set": updateFields}); err != nil {
		return nil, err
	}

	var updatedMedias []models.Media
	err := app.DB.FindMany(ctx, mediaCollection, bson.M{"mediaGroupId": mediaGroupID}, &updatedMedias)
	return updatedMedias, err
}
