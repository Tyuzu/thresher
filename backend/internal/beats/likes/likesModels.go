package likes

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Like struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID     string             `bson:"user_id" json:"user_id"`
	EntityType string             `bson:"entity_type" json:"entity_type"`
	EntityID   string             `bson:"entity_id" json:"entity_id"`
	CreatedAt  time.Time          `bson:"created_at" json:"created_at"`
}

const (
	EntityTypePost = "post"
	EntityTypeBeat = "beat"
)

func IsValidEntityType(entityType string) bool {
	switch entityType {
	case EntityTypePost, EntityTypeBeat:
		return true
	default:
		return false
	}
}
