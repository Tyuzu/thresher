package mq

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/nats-io/nats.go"
)

var ErrJetStreamNotInitialized = errors.New(
	"jetstream context is not initialized",
)

// JetStreamMQ implements the MQ interface using NATS JetStream.
type JetStreamMQ struct {
	js nats.JetStreamContext
}

// NewJetStreamMQ creates a new JetStream MQ client.
func NewJetStreamMQ(
	js nats.JetStreamContext,
) *JetStreamMQ {
	return &JetStreamMQ{
		js: js,
	}
}

// -----------------------------------------------------------------------------
// Subscription
// -----------------------------------------------------------------------------

type jetStreamSubscription struct {
	sub *nats.Subscription
}

// Unsubscribe immediately stops the subscription.
func (s *jetStreamSubscription) Unsubscribe() error {
	if s == nil || s.sub == nil {
		return nil
	}

	return s.sub.Unsubscribe()
}

// -----------------------------------------------------------------------------
// Publish
// -----------------------------------------------------------------------------

func (j *JetStreamMQ) Publish(
	ctx context.Context,
	subject string,
	data []byte,
) error {
	if j == nil || j.js == nil {
		return ErrJetStreamNotInitialized
	}

	if ctx == nil {
		ctx = context.Background()
	}

	if subject == "" {
		return errors.New("jetstream subject is empty")
	}

	msg := &nats.Msg{
		Subject: subject,
		Data:    data,
	}

	_, err := j.js.PublishMsg(
		msg,
		nats.Context(ctx),
	)

	if err != nil {
		return fmt.Errorf(
			"publish to jetstream subject %q failed: %w",
			subject,
			err,
		)
	}

	return nil
}

// -----------------------------------------------------------------------------
// Ping
// -----------------------------------------------------------------------------

func (j *JetStreamMQ) Ping(
	ctx context.Context,
) error {
	if j == nil || j.js == nil {
		return ErrJetStreamNotInitialized
	}

	if ctx == nil {
		ctx = context.Background()
	}

	_, err := j.js.AccountInfo(
		nats.Context(ctx),
	)

	if err != nil {
		return fmt.Errorf(
			"jetstream ping failed: %w",
			err,
		)
	}

	return nil
}

// -----------------------------------------------------------------------------
// Subscribe
// -----------------------------------------------------------------------------

func (j *JetStreamMQ) Subscribe(
	ctx context.Context,
	subject string,
	handler MessageHandler,
) (Subscription, error) {
	return j.QueueSubscribe(
		ctx,
		subject,
		"",
		handler,
	)
}

// -----------------------------------------------------------------------------
// QueueSubscribe
// -----------------------------------------------------------------------------

func (j *JetStreamMQ) QueueSubscribe(
	ctx context.Context,
	subject string,
	queue string,
	handler MessageHandler,
) (Subscription, error) {
	if j == nil || j.js == nil {
		return nil, ErrJetStreamNotInitialized
	}

	if ctx == nil {
		ctx = context.Background()
	}

	if subject == "" {
		return nil, errors.New(
			"jetstream subject is empty",
		)
	}

	if handler == nil {
		return nil, errors.New(
			"message handler is nil",
		)
	}

	// -------------------------------------------------------------------------
	// Message callback
	// -------------------------------------------------------------------------

	callback := func(msg *nats.Msg) {
		// Give the handler a maximum of 30 seconds.
		//
		// Because this context is derived from ctx, application shutdown
		// also cancels the handler context.
		hCtx, cancel := context.WithTimeout(
			ctx,
			30*time.Second,
		)
		defer cancel()

		message := Message{
			Subject: msg.Subject,
			Data:    msg.Data,
		}

		// Call the application handler.
		err := handler(hCtx, message)

		if err != nil {
			// Handler failed.
			//
			// NACK tells JetStream that the message was not processed.
			// JetStream can then redeliver it.
			_ = msg.Nak()
			return
		}

		// Handler succeeded.
		//
		// ACK tells JetStream that the message has been processed.
		_ = msg.Ack()
	}

	// -------------------------------------------------------------------------
	// JetStream options
	// -------------------------------------------------------------------------

	opts := []nats.SubOpt{
		// We manually ACK after the handler succeeds.
		nats.ManualAck(),

		// ACK must explicitly come from our code.
		nats.AckExplicit(),

		// If the handler doesn't ACK within 30 seconds,
		// JetStream may redeliver the message.
		nats.AckWait(30 * time.Second),

		// Don't retry a failed message forever.
		nats.MaxDeliver(5),
	}

	var (
		sub *nats.Subscription
		err error
	)

	// -------------------------------------------------------------------------
	// Create subscription
	// -------------------------------------------------------------------------

	if queue != "" {
		// Queue subscription.
		//
		// Example:
		//
		//     queue = "chat-workers"
		//
		// If you run 3 API instances with the same queue name,
		// JetStream distributes messages between those instances.
		sub, err = j.js.QueueSubscribe(
			subject,
			queue,
			callback,
			opts...,
		)
	} else {
		// Normal subscription.
		//
		// Every subscriber receives the message.
		sub, err = j.js.Subscribe(
			subject,
			callback,
			opts...,
		)
	}

	if err != nil {
		return nil, fmt.Errorf(
			"failed to create jetstream subscription subject=%q queue=%q: %w",
			subject,
			queue,
			err,
		)
	}

	// -------------------------------------------------------------------------
	// Shutdown handling
	// -------------------------------------------------------------------------

	go func() {
		<-ctx.Done()

		// Drain allows already-dispatched messages to finish.
		//
		// This is important during graceful application shutdown.
		_ = sub.Drain()
	}()

	return &jetStreamSubscription{
		sub: sub,
	}, nil
}
