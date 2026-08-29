package workers

import (
	"context"
	"fmt"

	"scav/infra/mq"
	"scav/utils/logger"
)

func handleNotificationCreated(
	ctx context.Context,
	msg mq.Message,
) error {
	event, err := mq.UnpackEnvelope(msg.Data)
	if err != nil {
		return fmt.Errorf(
			"unpack notification.created event: %w",
			err,
		)
	}

	logger.L.Sugar().Infow(
		"processing notification.created",
		"event_id", event.ID,
		"trace_id", event.TraceID,
		"source", event.Source,
	)

	// Notification business logic.

	return nil
}
