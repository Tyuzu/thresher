package mqevent

/* ============================================================
   MEDIA UPLOAD EVENTS
============================================================ */

const (
	MediaUploaded = "media.uploaded"
)

type MediaUploadedPayload struct {
	EntityType string `json:"entity_type"`
	EntityID   string `json:"entity_id"`
	FilePath   string `json:"file_path"`
	Extension  string `json:"extension"`
	FileName   string `json:"file_name"`
	Timestamp  int64  `json:"timestamp"`
}
