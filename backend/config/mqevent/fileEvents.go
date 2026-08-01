package mqevent

import "time"

/* ============================================================
   FILE EVENTS
============================================================ */

const (
	FileCreatedEvent = "file.created"
	FileUpdatedEvent = "file.updated"
	FileRemovedEvent = "file.removed"
)

type FileCreatedPayload struct {
	FileID     string    `json:"file_id,omitempty"`
	FileIDs    []string  `json:"file_ids,omitempty"`
	UserID     string    `json:"user_id"`
	EntityType string    `json:"entity_type"`
	EntityID   string    `json:"entity_id,omitempty"`
	Count      int       `json:"count"`
	OccurredAt time.Time `json:"occurred_at"`
}

type FileUpdatedPayload struct {
	FileID     string    `json:"file_id"`
	UserID     string    `json:"user_id,omitempty"`
	EntityType string    `json:"entity_type,omitempty"`
	EntityID   string    `json:"entity_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

type FileRemovedPayload struct {
	FileID     string    `json:"file_id"`
	UserID     string    `json:"user_id,omitempty"`
	EntityType string    `json:"entity_type,omitempty"`
	EntityID   string    `json:"entity_id,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

// Helper Constructors for Clean Event Instantiation

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

func NewFileRemovedPayload(fileID, userID, entityType, entityID string) FileRemovedPayload {
	return FileRemovedPayload{
		FileID:     fileID,
		UserID:     userID,
		EntityType: entityType,
		EntityID:   entityID,
		OccurredAt: time.Now().UTC(),
	}
}
