package mqevent

const (
	UserFollowedEvent                   = "user.followed"
	UserLikedEvent                      = "post.liked"
	UserLikesBatchFlushedEvent          = "batch.flush.likes"
	OneNotificatioCreatedEvent          = "batch.flush.likes"
	BulkNotificationsCreatedEvent       = "batch.flush.likes"
	OneNotificationReadEvent            = "batch.flush.likes"
	AllNotificationsReadEvent           = "batch.flush.likes"
	NotificationDeletedEvent            = "batch.flush.likes"
	AllNotificationsClearedEvent        = "batch.flush.likes"
	NotificationPreferencesUpdatedEvent = "batch.flush.likes"
)

type UserFollowedPayload struct {
}

type UserLikedPayload struct {
}

type UserLikesBatchFlushedPayload struct {
}

type OneNotificatioCreatedPayload struct {
}

type BulkNotificationsCreatedPayload struct {
}

type OneNotificationReadPayload struct {
}

type AllNotificationsReadPayload struct {
}

type NotificationDeletedPayload struct {
}

type AllNotificationsClearedPayload struct {
}

type NotificationPreferencesUpdatedPayload struct {
}
