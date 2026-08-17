package mqevent

import "time"

/* ============================================================
   NOTICE EVENTS
============================================================ */

const (
	NoticeCreatedEvent = "notice.created"
	NoticeUpdatedEvent = "notice.updated"
	NoticeDeletedEvent = "notice.deleted"
)

/* ============================================================
   NOTICE CREATED
============================================================ */

type NoticeCreatedPayload struct {
	NoticeID   string    `json:"notice_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   NOTICE UPDATED
============================================================ */

type NoticeUpdatedPayload struct {
	NoticeID   string    `json:"notice_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   NOTICE DELETED
============================================================ */

type NoticeDeletedPayload struct {
	NoticeID   string    `json:"notice_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
