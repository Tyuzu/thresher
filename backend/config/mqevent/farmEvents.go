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
	FarmName   string    `json:"farm_name"`
	Location   string    `json:"location"`
	OccurredAt time.Time `json:"occurred_at"`
}

type FarmUpdatedPayload struct {
	FarmID     string    `json:"farmid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type FarmDeletedPayload struct {
	FarmID     string    `json:"farmid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CropCreatedPayload struct {
	CropID     string    `json:"cropid"`
	FarmID     string    `json:"farmid"`
	UserID     string    `json:"userid"`
	CropName   string    `json:"crop_name"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CropUpdatedPayload struct {
	CropID     string    `json:"cropid"`
	FarmID     string    `json:"farmid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type FarmProductCreatedPayload struct {
	ProductID   string    `json:"productid"`
	UserID      string    `json:"userid"`
	ProductName string    `json:"product_name"`
	OccurredAt  time.Time `json:"occurred_at"`
}

type FarmProductUpdatedPayload struct {
	ProductID  string    `json:"productid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CropBoughtPayload struct {
	ProductID  string    `json:"productid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type OrderStatusUpdatedPayload struct {
	ProductID  string    `json:"productid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type OrdersBulkUpdatedPayload struct {
	ProductID  string    `json:"productid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CropAboutCreatedPayload struct {
	ProductID  string    `json:"productid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CropAboutUpdatedPayload struct {
	ProductID  string    `json:"productid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CropAboutDeletedPayload struct {
	ProductID  string    `json:"productid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type FarmProductDeletedPayload struct {
	ProductID  string    `json:"productid"`
	UserID     string    `json:"userid"`
	OccurredAt time.Time `json:"occurred_at"`
}
