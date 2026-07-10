package mqevent

import "time"

/* ============================================================
   VENDOR EVENTS
============================================================ */

const (
	VendorCreated = "vendor.created"
	VendorUpdated = "vendor.updated"
	VendorRemoved = "vendor.removed"
)

type VendorCreatedPayload struct {
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
