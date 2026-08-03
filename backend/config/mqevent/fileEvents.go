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
	FileID     string    `json:"fileid,omitempty"`
	FileIDs    []string  `json:"fileids,omitempty"`
	UserID     string    `json:"userid"`
	EntityType string    `json:"entitytype"`
	EntityID   string    `json:"entityid,omitempty"`
	Count      int       `json:"count"`
	OccurredAt time.Time `json:"occurredat"`
}

type FileUpdatedPayload struct {
	FileID     string    `json:"fileid"`
	UserID     string    `json:"userid,omitempty"`
	EntityType string    `json:"entitytype,omitempty"`
	EntityID   string    `json:"entityid,omitempty"`
	OccurredAt time.Time `json:"occurredat"`
}

type FileRemovedPayload struct {
	FileID     string    `json:"fileid"`
	UserID     string    `json:"userid,omitempty"`
	EntityType string    `json:"entitytype,omitempty"`
	EntityID   string    `json:"entityid,omitempty"`
	OccurredAt time.Time `json:"occurredat"`
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
