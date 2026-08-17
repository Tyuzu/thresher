package mqevent

import "time"

/* ============================================================
   VENDOR EVENTS
============================================================ */

const (
	VendorRegisteredEvent    = "vendor.registered"
	VendorUpdatedEvent       = "vendor.updated"
	VendorDeletedEvent       = "vendor.deleted"
	VendorHiredEvent         = "vendor.hired"
	VendorStatusUpdatedEvent = "vendor.status.updated"
)

/* ============================================================
   VENDOR REGISTERED
============================================================ */

type VendorRegisteredPayload struct {
	VendorID   string    `json:"vendor_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   VENDOR UPDATED
============================================================ */

type VendorUpdatedPayload struct {
	VendorID   string    `json:"vendor_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   VENDOR DELETED
============================================================ */

type VendorDeletedPayload struct {
	VendorID   string    `json:"vendor_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   VENDOR HIRED
============================================================ */

type VendorHiredPayload struct {
	VendorID   string    `json:"vendor_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   VENDOR STATUS
============================================================ */

type VendorStatusUpdatedPayload struct {
	VendorID   string    `json:"vendor_id"`
	Status     string    `json:"status"`
	OccurredAt time.Time `json:"occurred_at"`
}
