package middleware

import (
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

// SoftDeleteFields adds soft delete fields to records
type SoftDeleteFields struct {
	DeletedAt *time.Time `bson:"deletedat,omitempty" json:"deletedat,omitempty"`
	DeletedBy string     `bson:"deletedby,omitempty" json:"deletedby,omitempty"`
	Reason    string     `bson:"deletereason,omitempty" json:"deletereason,omitempty"`
}

// MarkDeleted creates update filter for soft deletion
func MarkDeleted(userID string, reason string) bson.M {
	now := time.Now()
	return bson.M{
		"$set": bson.M{
			"deletedat":    now,
			"deletedby":    userID,
			"deletereason": reason,
		},
	}
}

// ExcludeDeleted creates filter to exclude soft-deleted records
func ExcludeDeleted() bson.M {
	return bson.M{
		"deletedat": nil,
	}
}

// ExcludeDeleted2 creates filter to exclude soft-deleted records (alt format)
func ExcludeDeletedAlt() bson.M {
	return bson.M{
		"deletedat": bson.M{"$exists": false},
	}
}

// PermanentDelete creates hard delete (use only for GDPR/compliance)
func PermanentDelete() bson.M {
	return bson.M{}
}
