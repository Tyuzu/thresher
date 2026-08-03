package mqevent

import "time"

/* ============================================================
   FARM EVENTS
============================================================ */

const (
	FarmCreatedEvent        = "farm.created"
	FarmUpdatedEvent        = "farm.updated"
	FarmDeletedEvent        = "farm.deleted"
	CropCreatedEvent        = "crop.created"
	CropUpdatedEvent        = "crop.updated"
	CropDeletedEvent        = "crop.deleted"
	FarmProductCreatedEvent = "product.created"
	FarmProductUpdatedEvent = "product.updated"
	FarmProductDeletedEvent = "product.deleted"
	CropBoughtEvent         = "product.updated"
	OrderStatusUpdatedEvent = "product.updated"
	OrdersBulkUpdatedEvent  = "product.updated"
	CropAboutCreatedEvent   = "product.updated"
	CropAboutUpdatedEvent   = "product.updated"
	CropAboutDeletedEvent   = "product.updated"
)

type FarmCreatedPayload struct {
	FarmID     string    `json:"farmid"`
	UserID     string    `json:"userid"`
	FarmName   string    `json:"farmname"`
	Location   string    `json:"location"`
	OccurredAt time.Time `json:"occurredat"`
}

type FarmUpdatedPayload struct {
	FarmID     string    `json:"farmid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurredat"`
}

type FarmDeletedPayload struct {
	FarmID     string    `json:"farmid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurredat"`
}

type CropCreatedPayload struct {
	CropID     string    `json:"cropid"`
	FarmID     string    `json:"farmid"`
	UserID     string    `json:"userid"`
	CropName   string    `json:"cropname"`
	OccurredAt time.Time `json:"occurredat"`
}

type CropUpdatedPayload struct {
	CropID     string    `json:"cropid"`
	FarmID     string    `json:"farmid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurredat"`
}

type FarmProductCreatedPayload struct {
	ProductID   string    `json:"productid"`
	UserID      string    `json:"userid"`
	ProductName string    `json:"productname"`
	OccurredAt  time.Time `json:"occurredat"`
}

type FarmProductUpdatedPayload struct {
	ProductID  string    `json:"productid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurredat"`
}

type CropBoughtPayload struct {
	ProductID  string    `json:"productid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurredat"`
}

type OrderStatusUpdatedPayload struct {
	ProductID  string    `json:"productid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurredat"`
}

type OrdersBulkUpdatedPayload struct {
	ProductID  string    `json:"productid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurredat"`
}

type CropAboutCreatedPayload struct {
	ProductID  string    `json:"productid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurredat"`
}

type CropAboutUpdatedPayload struct {
	ProductID  string    `json:"productid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurredat"`
}

type CropAboutDeletedPayload struct {
	ProductID  string    `json:"productid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurredat"`
}

type FarmProductDeletedPayload struct {
	ProductID  string    `json:"productid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurredat"`
}
