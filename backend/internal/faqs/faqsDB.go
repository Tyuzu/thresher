package faqs

import (
	"context"

	"naevis/config"
	db "naevis/infra/db"

	"go.mongodb.org/mongo-driver/bson"
)

var faqsCollection = config.Collections.FAQsCollection

func insertFAQ(ctx context.Context, database db.Database, faq FAQ) error {
	return database.Insert(ctx, faqsCollection, faq)
}

func findFAQByID(ctx context.Context, database db.Database, faqID string, faq *FAQ) error {
	return database.FindOne(ctx, faqsCollection, bson.M{"faqid": faqID}, faq)
}

func updateFAQContent(ctx context.Context, database db.Database, faqID string, update bson.M) (any, error) {
	return database.UpdateOne(ctx, faqsCollection, bson.M{"faqid": faqID}, update)
}

func deleteFAQ(ctx context.Context, database db.Database, faqID, userID string) (int64, error) {
	return database.Delete(ctx, faqsCollection, bson.M{"faqid": faqID, "createdby": userID})
}

func findFAQsByEntity(
	ctx context.Context,
	database db.Database,
	entityType string,
	entityID string,
	opts db.FindManyOptions,
	faqs *[]FAQ,
) error {
	filter := bson.M{
		"entity_type": entityType,
		"entity_id":   entityID,
	}
	return database.FindManyWithOptions(ctx, faqsCollection, filter, opts, faqs)
}
