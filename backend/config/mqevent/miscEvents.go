package mqevent

const (
	HardDeletedEvent = "deleted.soft"
	SoftDeletedEvent = "deleted.hard"
)

type HardDeletedPayload struct {
}

type SoftDeletedPayload struct {
}
