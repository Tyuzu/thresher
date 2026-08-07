package fanmade

import (
	"context"
	"naevis/config"
	"naevis/infra"
	"naevis/infra/db"
	"naevis/internal/media"
)

var fanmadeMediaCollection = config.Collections.MediaCollection

func insertFanMedia(ctx context.Context, app *infra.Deps, media media.Media) error {
	return app.DB.Insert(ctx, fanmadeMediaCollection, media)
}

func getFanMediaByID(ctx context.Context, app *infra.Deps, entityType, entityID, mediaID string) (media.Media, error) {
	var media media.Media
	err := app.DB.FindOne(ctx, fanmadeMediaCollection, map[string]string{
		"entityid":   entityID,
		"entitytype": entityType,
		"mediaid":    mediaID,
	}, &media)
	return media, err
}

func listFanMediasByEntity(ctx context.Context, app *infra.Deps, entityType, entityID string) ([]media.Media, error) {
	var medias []media.Media
	opts := db.FindManyOptions{}
	err := app.DB.FindManyWithOptions(ctx, fanmadeMediaCollection, map[string]string{
		"entityid":   entityID,
		"entitytype": entityType,
	}, opts, &medias)
	return medias, err
}

func listFanMediaGroupsByEntity(ctx context.Context, app *infra.Deps, entityType, entityID string) ([]map[string]any, error) {
	medias, err := listFanMediasByEntity(ctx, app, entityType, entityID)
	if err != nil {
		return nil, err
	}

	mediaMap := make(map[string][]media.Media)
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

func updateFanMediaGroup(ctx context.Context, app *infra.Deps, mediaGroupID string, update map[string]any) ([]media.Media, error) {
	if _, err := app.DB.UpdateMany(ctx, fanmadeMediaCollection, map[string]string{"mediaGroupId": mediaGroupID}, map[string]any{"$set": update}); err != nil {
		return nil, err
	}

	var updatedMedias []media.Media
	opts := db.FindManyOptions{}
	err := app.DB.FindManyWithOptions(ctx, fanmadeMediaCollection, map[string]string{"mediaGroupId": mediaGroupID}, opts, &updatedMedias)
	return updatedMedias, err
}

func deleteFanMediaByID(ctx context.Context, app *infra.Deps, mediaID string) (int64, error) {
	return app.DB.DeleteOne(ctx, fanmadeMediaCollection, map[string]string{"mediaid": mediaID})
}
