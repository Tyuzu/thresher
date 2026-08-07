package mqevent

import "time"

/* ============================================================
   FAQ EVENTS
============================================================ */

const (
	FAQCreatedEvent = "faq.created"
	FAQUpdatedEvent = "faq.updated"
	FAQRemovedEvent = "faq.removed"
)

type FAQCreatedPayload struct {
	FAQID      string    `json:"faqid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type FAQUpdatedPayload struct {
	FAQID      string    `json:"faqid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type FAQDeletedPayload struct {
	FAQID      string    `json:"faqid"`
	OccurredAt time.Time `json:"occurred_at"`
}
