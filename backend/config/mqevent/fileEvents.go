package mqevent

import "time"

/* ============================================================
   FILE EVENTS
============================================================ */

const (
	FileCreatedEvent = "file.created"
	FileUpdatedEvent = "file.updated"
	FileDeletedEvent = "file.deleted"
)

/* ============================================================
   FILE CREATED
============================================================ */

type FileCreatedPayload struct {
	FileID     string    `json:"file_id,omitempty"`
	FileIDs    []string  `json:"file_ids,omitempty"`
	UserID     string    `json:"user_id"`
	EntityType string    `json:"entity_type"`
	EntityID   string    `json:"entity_id,omitempty"`
	Count      int       `json:"count"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   FILE UPDATED
============================================================ */

type FileUpdatedPayload struct {
	FileID     string    `json:"file_id"`
	UserID     string    `json:"user_id,omitempty"`
	EntityType string    `json:"entity_type,omitempty"`
	EntityID   string    `json:"entity_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   FILE DELETED
============================================================ */

type FileDeletedPayload struct {
	FileID     string    `json:"file_id"`
	UserID     string    `json:"user_id,omitempty"`
	EntityType string    `json:"entity_type,omitempty"`
	EntityID   string    `json:"entity_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   HELPER CONSTRUCTORS
============================================================ */

func NewFileCreatedPayload(userID, entityType, entityID string, fileIDs []string) FileCreatedPayload {
	var singleFileID string
	if len(fileIDs) == 1 {
		singleFileID = fileIDs[0]
	}
	return FileCreatedPayload{
		FileID:     singleFileID,
		FileIDs:    fileIDs,
		UserID:     userID,
		EntityType: entityType,
		EntityID:   entityID,
		Count:      len(fileIDs),
		OccurredAt: time.Now().UTC(),
	}
}

func NewFileUpdatedPayload(fileID, userID, entityType, entityID string) FileUpdatedPayload {
	return FileUpdatedPayload{
		FileID:     fileID,
		UserID:     userID,
		EntityType: entityType,
		EntityID:   entityID,
		OccurredAt: time.Now().UTC(),
	}
}

func NewFileDeletedPayload(fileID, userID, entityType, entityID string) FileDeletedPayload {
	return FileDeletedPayload{
		FileID:     fileID,
		UserID:     userID,
		EntityType: entityType,
		EntityID:   entityID,
		OccurredAt: time.Now().UTC(),
	}
}
