package beats

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Like struct {
	ID         primitive.ObjectID `bson:"_id,omitempty"`
	UserID     string             `bson:"userid"`
	EntityType string             `bson:"entity_type"` // e.g. "post"
	EntityID   string             `bson:"entity_id"`   // e.g. post ID
	CreatedAt  time.Time          `bson:"created_at"`
}
