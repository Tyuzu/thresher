package mqevent

import "time"

/* ============================================================
   FARM EVENTS
============================================================ */

const (
	FarmCreatedEvent = "farm.created"
	FarmUpdatedEvent = "farm.updated"
	FarmRemovedEvent = "farm.removed"
)

/* ============================================================
   CROP EVENTS
============================================================ */

const (
	CropCreatedEvent = "crop.created"
	CropUpdatedEvent = "crop.updated"
	CropRemovedEvent = "crop.removed"
)

/* ============================================================
   FARM PRODUCT EVENTS
============================================================ */

const (
	FarmProductCreatedEvent = "farm.product.created"
	FarmProductUpdatedEvent = "farm.product.updated"
	FarmProductRemovedEvent = "farm.product.removed"
)

/* ============================================================
   CROP PURCHASE EVENTS
============================================================ */

const (
	CropBoughtEvent = "crop.bought"
)

/* ============================================================
   FARM ORDER EVENTS
============================================================ */

const (
	OrderStatusUpdatedEvent = "farm.order.status.updated"
	OrdersBulkUpdatedEvent  = "farm.orders.bulk.updated"
)

/* ============================================================
   CROP ABOUT EVENTS
============================================================ */

const (
	CropAboutCreatedEvent = "crop.about.created"
	CropAboutUpdatedEvent = "crop.about.updated"
	CropAboutRemovedEvent = "crop.about.removed"
)

/* ============================================================
   FARM CREATED
============================================================ */

type FarmCreatedPayload struct {
	FarmID     string    `json:"farm_id"`
	UserID     string    `json:"user_id"`
	FarmName   string    `json:"farm_name"`
	Location   string    `json:"location"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   FARM UPDATED
============================================================ */

type FarmUpdatedPayload struct {
	FarmID     string    `json:"farm_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   FARM REMOVED
============================================================ */

type FarmRemovedPayload struct {
	FarmID     string    `json:"farm_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   CROP CREATED
============================================================ */

type CropCreatedPayload struct {
	CropID     string    `json:"crop_id"`
	FarmID     string    `json:"farm_id"`
	UserID     string    `json:"user_id"`
	CropName   string    `json:"crop_name"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   CROP UPDATED
============================================================ */

type CropUpdatedPayload struct {
	CropID     string    `json:"crop_id"`
	FarmID     string    `json:"farm_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   CROP REMOVED
============================================================ */

type CropRemovedPayload struct {
	CropID     string    `json:"crop_id"`
	FarmID     string    `json:"farm_id"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   FARM PRODUCT CREATED
============================================================ */

type FarmProductCreatedPayload struct {
	ProductID   string    `json:"product_id"`
	FarmID      string    `json:"farm_id,omitempty"`
	CropID      string    `json:"crop_id,omitempty"`
	UserID      string    `json:"user_id"`
	ProductName string    `json:"product_name"`
	OccurredAt  time.Time `json:"occurred_at"`
}

/* ============================================================
   FARM PRODUCT UPDATED
============================================================ */

type FarmProductUpdatedPayload struct {
	ProductID  string    `json:"product_id"`
	FarmID     string    `json:"farm_id,omitempty"`
	CropID     string    `json:"crop_id,omitempty"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   FARM PRODUCT REMOVED
============================================================ */

type FarmProductRemovedPayload struct {
	ProductID  string    `json:"product_id"`
	FarmID     string    `json:"farm_id,omitempty"`
	CropID     string    `json:"crop_id,omitempty"`
	UserID     string    `json:"user_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   CROP BOUGHT
============================================================ */

type CropBoughtPayload struct {
	ProductID  string    `json:"product_id"`
	CropID     string    `json:"crop_id,omitempty"`
	UserID     string    `json:"user_id"`
	Quantity   int       `json:"quantity,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   ORDER STATUS UPDATED
============================================================ */

type OrderStatusUpdatedPayload struct {
	OrderID        string    `json:"order_id"`
	UserID         string    `json:"user_id,omitempty"`
	Status         string    `json:"status"`
	PreviousStatus string    `json:"previous_status,omitempty"`
	OccurredAt     time.Time `json:"occurred_at"`
}

/* ============================================================
   ORDERS BULK UPDATED
============================================================ */

type OrdersBulkUpdatedPayload struct {
	OrderIDs   []string  `json:"order_ids"`
	UserID     string    `json:"user_id,omitempty"`
	Status     string    `json:"status,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   CROP ABOUT CREATED
============================================================ */

type CropAboutCreatedPayload struct {
	CropAboutID string    `json:"crop_about_id"`
	CropID      string    `json:"crop_id"`
	UserID      string    `json:"user_id"`
	OccurredAt  time.Time `json:"occurred_at"`
}

/* ============================================================
   CROP ABOUT UPDATED
============================================================ */

type CropAboutUpdatedPayload struct {
	CropAboutID string    `json:"crop_about_id"`
	CropID      string    `json:"crop_id"`
	UserID      string    `json:"user_id"`
	OccurredAt  time.Time `json:"occurred_at"`
}

/* ============================================================
   CROP ABOUT REMOVED
============================================================ */

type CropAboutRemovedPayload struct {
	CropAboutID string    `json:"crop_about_id"`
	CropID      string    `json:"crop_id"`
	UserID      string    `json:"user_id"`
	OccurredAt  time.Time `json:"occurred_at"`
}
