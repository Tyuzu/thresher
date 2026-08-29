package workers

import (
	"context"
	"fmt"

	"scav/infra"
	"scav/infra/mq"
	"scav/utils/logger"
)

// eventRegistration describes one MQ consumer.
//
// RegisterAll uses this list to create all subscriptions during
// application startup.
type eventRegistration struct {
	Subject string
	Queue   string
	Handler mq.MessageHandler
}

// RegisterAll registers every MQ consumer used by the application.
//
// This function should be called exactly once during application startup.
//
// It is responsible ONLY for wiring:
//
//	Subject -> Queue -> Handler
//
// Business logic belongs inside the individual handlers.
func RegisterAll(
	ctx context.Context,
	app *infra.Deps,
) error {
	if ctx == nil {
		return fmt.Errorf("context is nil")
	}

	if app == nil {
		return fmt.Errorf("app is nil")
	}

	if app.MQ == nil {
		return fmt.Errorf("MQ is not initialized")
	}

	registrations := []eventRegistration{
		// ---------------------------------------------------------------------
		// Chat
		// ---------------------------------------------------------------------
		{
			Subject: "chat.created",
			Queue:   "chat-workers",
			Handler: handleChatCreated,
		},
		{
			Subject: "chat.message.created",
			Queue:   "chat-workers",
			Handler: handleChatMessageCreated,
		},
		{
			Subject: "chat.message.updated",
			Queue:   "chat-workers",
			Handler: handleChatMessageUpdated,
		},
		{
			Subject: "chat.message.deleted",
			Queue:   "chat-workers",
			Handler: handleChatMessageDeleted,
		},

		// ---------------------------------------------------------------------
		// User
		// ---------------------------------------------------------------------
		{
			Subject: "user.created",
			Queue:   "user-workers",
			Handler: handleUserCreated,
		},
		{
			Subject: "user.updated",
			Queue:   "user-workers",
			Handler: handleUserUpdated,
		},
		{
			Subject: "user.deleted",
			Queue:   "user-workers",
			Handler: handleUserDeleted,
		},

		// ---------------------------------------------------------------------
		// Notifications
		// ---------------------------------------------------------------------
		{
			Subject: "notification.created",
			Queue:   "notification-workers",
			Handler: handleNotificationCreated,
		},
	}

	// -------------------------------------------------------------------------
	// Register subscriptions
	// -------------------------------------------------------------------------

	for _, registration := range registrations {
		if registration.Subject == "" {
			return fmt.Errorf("MQ registration has empty subject")
		}

		if registration.Queue == "" {
			return fmt.Errorf(
				"MQ registration %q has empty queue",
				registration.Subject,
			)
		}

		if registration.Handler == nil {
			return fmt.Errorf(
				"MQ registration %q has nil handler",
				registration.Subject,
			)
		}

		_, err := app.MQ.QueueSubscribe(
			ctx,
			registration.Subject,
			registration.Queue,
			registration.Handler,
		)

		if err != nil {
			return fmt.Errorf(
				"subscribe subject=%q queue=%q: %w",
				registration.Subject,
				registration.Queue,
				err,
			)
		}

		logger.L.Sugar().Infow(
			"MQ subscriber registered",
			"subject", registration.Subject,
			"queue", registration.Queue,
		)
	}

	logger.L.Sugar().Infow(
		"all MQ subscribers registered",
		"count", len(registrations),
	)

	return nil
}
