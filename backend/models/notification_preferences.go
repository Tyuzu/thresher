package models

import "time"

type NotificationPreferences struct {
	ID     string `bson:"_id" json:"id"`
	UserID string `bson:"userid" json:"userid"`

	Mentionsenabled bool `bson:"mentionsenabled" json:"mentionsenabled"`
	Followsenabled  bool `bson:"followsenabled" json:"followsenabled"`
	Commentsenabled bool `bson:"commentsenabled" json:"commentsenabled"`
	Likesenabled    bool `bson:"likesenabled" json:"likesenabled"`
	Messagesenabled bool `bson:"messagesenabled" json:"messagesenabled"`

	Allenabled bool `bson:"allenabled" json:"allenabled"`

	CreatedAt time.Time `bson:"createdat" json:"createdat"`
	UpdatedAt time.Time `bson:"updatedat" json:"updatedat"`
}
