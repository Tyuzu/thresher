package models

// ---------- Models ----------
type Slot struct {
	ID         string `json:"id" bson:"id"`
	EntityType string `json:"entitytype" bson:"entitytype"`
	EntityId   string `json:"entityid" bson:"entityid"`
	Date       string `json:"date" bson:"date"`
	Start      string `json:"start" bson:"start"`
	End        string `json:"end,omitempty" bson:"end,omitempty"`
	Capacity   int    `json:"capacity" bson:"capacity"`
	TierId     string `json:"tierid,omitempty" bson:"tierid,omitempty"`
	TierName   string `json:"tiername,omitempty" bson:"tiername,omitempty"`
	CreatedAt  int64  `json:"createdat" bson:"createdat"`
}

type Booking struct {
	ID         string  `json:"id" bson:"id"`
	SlotId     string  `json:"slotid,omitempty" bson:"slotid,omitempty"`
	TierId     string  `json:"tierid,omitempty" bson:"tierid,omitempty"`
	TierName   string  `json:"tiername,omitempty" bson:"tiername,omitempty"`
	PricePaid  float64 `json:"pricepaid,omitempty" bson:"pricepaid,omitempty"`
	EntityType string  `json:"entitytype" bson:"entitytype"`
	EntityId   string  `json:"entityid" bson:"entityid"`
	UserId     string  `json:"userid" bson:"i"`
	Date       string  `json:"date" bson:"date"`
	Start      string  `json:"start" bson:"start"`
	End        string  `json:"end,omitempty" bson:"end,omitempty"`
	Status     string  `json:"status" bson:"status"` // pending, confirmed, cancelled
	Seats      int     `json:"seats,omitempty" bson:"seats,omitempty"`
	CreatedAt  int64   `json:"createdat" bson:"createdat"`
}

type DateCap struct {
	EntityType string `json:"entitytype" bson:"entitytype"`
	EntityId   string `json:"entityid" bson:"entityid"`
	Date       string `json:"date" bson:"date"`
	Capacity   int    `json:"capacity" bson:"capacity"`
}

type Tier struct {
	ID         string   `json:"id" bson:"id"`
	EntityType string   `json:"entitytype" bson:"entitytype"`
	EntityId   string   `json:"entityid" bson:"entityid"`
	Name       string   `json:"name" bson:"name"`
	Price      float64  `json:"price" bson:"price"`
	Capacity   int      `json:"capacity" bson:"capacity"`
	TimeRange  []string `json:"timerange,omitempty" bson:"timerange,omitempty"`   // ["09:00", "17:00"]
	DaysOfWeek []int    `json:"daysofweek,omitempty" bson:"daysofweek,omitempty"` // 0=Sun..6=Sat
	Features   []string `json:"features,omitempty" bson:"features,omitempty"`
	CreatedAt  int64    `json:"createdat" bson:"createdat"`
}
