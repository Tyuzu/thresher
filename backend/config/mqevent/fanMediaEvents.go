package mqevent

import "time"

/* ============================================================
   FANMEDIA EVENTS
============================================================ */

const (
	FanMediaCreatedEvent = "fanmedia.created"
	FanMediaUpdatedEvent = "fanmedia.updated"
	FanMediaRemovedEvent = "fanmedia.removed"
)

type FanMediaCreatedPayload struct {
	FanMediaID string    `json:"fanmediaid"`
	EntityID   string    `json:"entityid"`
	EntityType string    `json:"entitytype"`
	CreatorID  string    `json:"creatorid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type FanMediaUpdatedPayload struct {
	FanMediaID string    `json:"fanmediaid"`
	EntityID   string    `json:"entityid"`
	EntityType string    `json:"entitytype"`
	UpdatedBy  string    `json:"updatedby"`
	OccurredAt time.Time `json:"occurred_at"`
}

type FanMediaRemovedPayload struct {
	FanMediaID string    `json:"fanmediaid"`
	EntityID   string    `json:"entityid"`
	EntityType string    `json:"entitytype"`
	DeletedBy  string    `json:"deletedby"`
	OccurredAt time.Time `json:"occurred_at"`
}
