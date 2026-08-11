package mqevent

/* ============================================================
   MEDIA UPLOAD EVENTS
============================================================ */

const (
	MediaUploadedEvent = "media.uploaded"
	MediaUpdatedEvent  = "media.updated"
)

type MediaUploadedPayload struct {
	EntityType string `json:"entitytype"`
	EntityID   string `json:"entityid"`
	FilePath   string `json:"file_path"`
	Extension  string `json:"extension"`
	FileName   string `json:"file_name"`
	Timestamp  int64  `json:"timestamp"`
}

type MediaUpdatedPayload struct {
	EntityType string `json:"entitytype"`
	EntityID   string `json:"entityid"`
	FilePath   string `json:"file_path"`
	Extension  string `json:"extension"`
	FileName   string `json:"file_name"`
	Timestamp  int64  `json:"timestamp"`
}
