package mqevent

import "time"

/* ============================================================
   VENDOR EVENTS
============================================================ */

const (
	VendorRegisteredEvent    = "vendor.created"
	VendorUpdatedEvent       = "vendor.updated"
	VendorDeletedEvent       = "vendor.removed"
	VendorHiredEvent         = "vendor.created"
	VendorStatusUpdatedEvent = "vendor.removed"
)

type VendorRegisteredPayload struct {
	VendorID   string    `json:"vendorid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type VendorUpdatedPayload struct {
	VendorID   string    `json:"vendorid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type VendorDeletedPayload struct {
	VendorID   string    `json:"vendorid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type VendorHiredPayload struct {
	VendorID   string    `json:"vendorid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type VendorStatusUpdatedPayload struct {
	VendorID   string    `json:"vendorid"`
	OccurredAt time.Time `json:"occurred_at"`
}
