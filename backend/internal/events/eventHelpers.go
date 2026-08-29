package events

import (
	"scav/internal/baito/vendors"
)

// toSafeEvent ensures no nil slices or zero-values, computes Prices & Currency.
func toSafeEvent(e Event) Event {
	// default empty slices
	if e.Artists == nil {
		e.Artists = []string{}
	}
	if e.Tags == nil {
		e.Tags = []string{}
	}
	if e.HiredVendors == nil {
		e.HiredVendors = []vendors.VendorHiring{}
	}

	// sanitize zero dates
	if !e.Date.IsZero() {
		e.Date = e.Date.UTC()
	}
	if !e.CreatedAt.IsZero() {
		e.CreatedAt = e.CreatedAt.UTC()
	}
	if !e.UpdatedAt.IsZero() {
		e.UpdatedAt = e.UpdatedAt.UTC()
	}
	return e
}
