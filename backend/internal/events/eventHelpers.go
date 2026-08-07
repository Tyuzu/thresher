package events

import (
	"naevis/internal/vendors"
	"naevis/models"
)

// toSafeEvent ensures no nil slices or zero-values, computes Prices & Currency.
func toSafeEvent(e models.Event) models.Event {
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
