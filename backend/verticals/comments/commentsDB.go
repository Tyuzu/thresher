package comments

import (
	"context"

	"naevis/config"
	db "naevis/infra/db"
	"naevis/models"

	"go.mongodb.org/mongo-driver/bson"
)

var commentsCollection = config.Collections.CommentsCollection

func insertComment(ctx context.Context, database db.Database, comment models.Comment) error {
	return database.Insert(ctx, commentsCollection, comment)
}

func findCommentByID(ctx context.Context, database db.Database, commentID string, comment *models.Comment) error {
	return database.FindOne(ctx, commentsCollection, bson.M{"commentid": commentID}, comment)
}

func updateCommentContent(ctx context.Context, database db.Database, commentID string, update bson.M) error {
	return database.UpdateOne(ctx, commentsCollection, bson.M{"commentid": commentID}, update)
}

func deleteComment(ctx context.Context, database db.Database, commentID, userID string) (int64, error) {
	return database.Delete(ctx, commentsCollection, bson.M{"commentid": commentID, "createdby": userID})
}

func findCommentsByEntity(
	ctx context.Context,
	database db.Database,
	entityType string,
	entityID string,
	opts db.FindManyOptions,
	comments *[]models.Comment,
) error {
	filter := bson.M{
		"entity_type": entityType,
		"entity_id":   entityID,
	}
	return database.FindManyWithOptions(ctx, commentsCollection, filter, opts, comments)
}
