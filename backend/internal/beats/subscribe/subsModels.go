package subscribe

type UserSubscribe struct {
	UserID      string   `json:"userid" bson:"userid"`
	Subscribed  []string `json:"subscribed,omitempty" bson:"subscribed,omitempty"`   // users this user is subscribed to
	Subscribers []string `json:"subscribers,omitempty" bson:"subscribers,omitempty"` // users who subscribed to this user
}
