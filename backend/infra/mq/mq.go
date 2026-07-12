package mq

import "context"

type Message struct {
	Subject string
	Data    []byte
}

type MessageHandler func(ctx context.Context, msg Message) error

type Subscription interface {
	Unsubscribe() error
}

type MQ interface {
	Publish(ctx context.Context, subject string, data []byte) error

	// Ping checks health of the MQ (non-destructive). Implementations should
	// perform a lightweight check and return nil if healthy.
	Ping(ctx context.Context) error

	Subscribe(
		ctx context.Context,
		subject string,
		handler MessageHandler,
	) (Subscription, error)

	QueueSubscribe(
		ctx context.Context,
		subject string,
		queue string,
		handler MessageHandler,
	) (Subscription, error)
}
