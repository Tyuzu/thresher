package mqevent

import "time"

/* ============================================================
   FARM EVENTS
============================================================ */

const (
	FarmCreatedEvent = "farm.created"
	FarmUpdatedEvent = "farm.updated"
	FarmDeletedEvent = "farm.deleted"
)

/* ============================================================
   CROP EVENTS
============================================================ */

const (
	CropCreatedEvent = "crop.created"
	CropUpdatedEvent = "crop.updated"
	CropDeletedEvent = "crop.deleted"
)

/* ============================================================
   FARM PRODUCT EVENTS
============================================================ */

const (
	FarmProductCreatedEvent = "farm.product.created"
	FarmProductUpdatedEvent = "farm.product.updated"
	FarmProductDeletedEvent = "farm.product.deleted"
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
	CropAboutDeletedEvent = "crop.about.deleted"
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
   FARM DELETED
============================================================ */

type FarmDeletedPayload struct {
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
   CROP DELETED
============================================================ */

type CropDeletedPayload struct {
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
   FARM PRODUCT DELETED
============================================================ */

type FarmProductDeletedPayload struct {
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
   CROP ABOUT DELETED
============================================================ */

type CropAboutDeletedPayload struct {
	CropAboutID string    `json:"crop_about_id"`
	CropID      string    `json:"crop_id"`
	UserID      string    `json:"user_id"`
	OccurredAt  time.Time `json:"occurred_at"`
}
