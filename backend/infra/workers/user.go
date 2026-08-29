package workers

import (
	"context"
	"fmt"

	"scav/infra/mq"
	"scav/utils/logger"
)

func handleUserCreated(
	ctx context.Context,
	msg mq.Message,
) error {
	event, err := mq.UnpackEnvelope(msg.Data)
	if err != nil {
		return fmt.Errorf(
			"unpack user.created event: %w",
			err,
		)
	}

	logger.L.Sugar().Infow(
		"processing user.created",
		"event_id", event.ID,
		"trace_id", event.TraceID,
		"source", event.Source,
	)

	// User-created business logic.

	return nil
}

func handleUserUpdated(
	ctx context.Context,
	msg mq.Message,
) error {
	event, err := mq.UnpackEnvelope(msg.Data)
	if err != nil {
		return fmt.Errorf(
			"unpack user.updated event: %w",
			err,
		)
	}

	logger.L.Sugar().Infow(
		"processing user.updated",
		"event_id", event.ID,
		"trace_id", event.TraceID,
		"source", event.Source,
	)

	// User-updated business logic.

	return nil
}

func handleUserDeleted(
	ctx context.Context,
	msg mq.Message,
) error {
	event, err := mq.UnpackEnvelope(msg.Data)
	if err != nil {
		return fmt.Errorf(
			"unpack user.deleted event: %w",
			err,
		)
	}

	logger.L.Sugar().Infow(
		"processing user.deleted",
		"event_id", event.ID,
		"trace_id", event.TraceID,
		"source", event.Source,
	)

	// User-deleted business logic.

	return nil
}
