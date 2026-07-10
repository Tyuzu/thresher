package mqevent

import "time"

/* ============================================================
   FARM EVENTS
============================================================ */

const (
	FarmCreated        = "farm.created"
	FarmUpdated        = "farm.updated"
	CropCreated        = "crop.created"
	CropUpdated        = "crop.updated"
	FarmProductCreated = "product.created"
	FarmProductUpdated = "product.updated"
)

type FarmCreatedPayload struct {
	FarmID     string    `json:"farm_id"`
	UserID     string    `json:"user_id"`
	FarmName   string    `json:"farm_name"`
	Location   string    `json:"location"`
	OccurredAt time.Time `json:"occurred_at"`
}

type FarmUpdatedPayload struct {
	FarmID     string    `json:"farm_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CropCreatedPayload struct {
	CropID     string    `json:"crop_id"`
	FarmID     string    `json:"farm_id"`
	UserID     string    `json:"user_id"`
	CropName   string    `json:"crop_name"`
	OccurredAt time.Time `json:"occurred_at"`
}

type CropUpdatedPayload struct {
	CropID     string    `json:"crop_id"`
	FarmID     string    `json:"farm_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

type FarmProductCreatedPayload struct {
	ProductID   string    `json:"product_id"`
	UserID      string    `json:"user_id"`
	ProductName string    `json:"product_name"`
	OccurredAt  time.Time `json:"occurred_at"`
}

type FarmProductUpdatedPayload struct {
	ProductID  string    `json:"product_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
