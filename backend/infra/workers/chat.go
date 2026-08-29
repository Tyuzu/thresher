package workers

import (
	"context"
	"fmt"

	"scav/infra/mq"
	"scav/utils/logger"
)

func handleChatCreated(
	ctx context.Context,
	msg mq.Message,
) error {
	event, err := mq.UnpackEnvelope(msg.Data)
	if err != nil {
		return fmt.Errorf(
			"unpack chat.created event: %w",
			err,
		)
	}

	logger.L.Sugar().Infow(
		"processing chat.created",
		"event_id", event.ID,
		"trace_id", event.TraceID,
		"source", event.Source,
	)

	// Your actual business logic goes here.
	//
	// Example:
	//
	// err = chatService.HandleCreated(ctx, event.Payload)
	// if err != nil {
	//     return err
	// }

	return nil
}

func handleChatMessageCreated(
	ctx context.Context,
	msg mq.Message,
) error {
	event, err := mq.UnpackEnvelope(msg.Data)
	if err != nil {
		return fmt.Errorf(
			"unpack chat.message.created event: %w",
			err,
		)
	}

	logger.L.Sugar().Infow(
		"processing chat.message.created",
		"event_id", event.ID,
		"trace_id", event.TraceID,
		"source", event.Source,
	)

	// Process the message here.

	return nil
}

func handleChatMessageUpdated(
	ctx context.Context,
	msg mq.Message,
) error {
	event, err := mq.UnpackEnvelope(msg.Data)
	if err != nil {
		return fmt.Errorf(
			"unpack chat.message.updated event: %w",
			err,
		)
	}

	logger.L.Sugar().Infow(
		"processing chat.message.updated",
		"event_id", event.ID,
		"trace_id", event.TraceID,
		"source", event.Source,
	)

	// Process update here.

	return nil
}

func handleChatMessageDeleted(
	ctx context.Context,
	msg mq.Message,
) error {
	event, err := mq.UnpackEnvelope(msg.Data)
	if err != nil {
		return fmt.Errorf(
			"unpack chat.message.deleted event: %w",
			err,
		)
	}

	logger.L.Sugar().Infow(
		"processing chat.message.deleted",
		"event_id", event.ID,
		"trace_id", event.TraceID,
		"source", event.Source,
	)

	// Process deletion here.

	return nil
}
