package mqevent

import "time"

/* ============================================================
   FAQ EVENTS
============================================================ */

const (
	FAQCreatedEvent = "faq.created"
	FAQUpdatedEvent = "faq.updated"
	FAQDeletedEvent = "faq.deleted"
)

/* ============================================================
   FAQ CREATED
============================================================ */

type FAQCreatedPayload struct {
	FAQID      string    `json:"faq_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   FAQ UPDATED
============================================================ */

type FAQUpdatedPayload struct {
	FAQID      string    `json:"faq_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   FAQ DELETED
============================================================ */

type FAQDeletedPayload struct {
	FAQID      string    `json:"faq_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
