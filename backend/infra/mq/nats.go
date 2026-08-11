package mq

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/nats-io/nats.go"
)

var ErrJetStreamNotInitialized = errors.New("jetstream context is not initialized")

type JetStreamMQ struct {
	js nats.JetStreamContext
}

func NewJetStreamMQ(js nats.JetStreamContext) *JetStreamMQ {
	return &JetStreamMQ{
		js: js,
	}
}

type jetStreamSubscription struct {
	sub *nats.Subscription
}

func (s *jetStreamSubscription) Unsubscribe() error {
	if s.sub == nil {
		return nil
	}
	return s.sub.Unsubscribe()
}

func (j *JetStreamMQ) Publish(ctx context.Context, subject string, data []byte) error {
	if j.js == nil {
		return ErrJetStreamNotInitialized
	}

	msg := &nats.Msg{
		Subject: subject,
		Data:    data,
	}

	_, err := j.js.PublishMsg(msg, nats.Context(ctx))
	if err != nil {
		return fmt.Errorf("publish to jetstream failed: %w", err)
	}
	return nil
}

func (j *JetStreamMQ) Ping(ctx context.Context) error {
	if j.js == nil {
		return ErrJetStreamNotInitialized
	}

	_, err := j.js.AccountInfo(nats.Context(ctx))
	if err != nil {
		return fmt.Errorf("jetstream ping failed: %w", err)
	}
	return nil
}

func (j *JetStreamMQ) Subscribe(ctx context.Context, subject string, handler MessageHandler) (Subscription, error) {
	return j.QueueSubscribe(ctx, subject, "", handler)
}

func (j *JetStreamMQ) QueueSubscribe(
	ctx context.Context,
	subject string,
	queue string,
	handler MessageHandler,
) (Subscription, error) {
	if j.js == nil {
		return nil, ErrJetStreamNotInitialized
	}

	callback := func(msg *nats.Msg) {
		m := Message{
			Subject: msg.Subject,
			Data:    msg.Data,
		}

		// Use a bounded execution context for handlers to avoid hanging forever
		hCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := handler(hCtx, m); err != nil {
			_ = msg.Nak()
			return
		}

		_ = msg.Ack()
	}

	opts := []nats.SubOpt{
		nats.ManualAck(),
		nats.AckExplicit(),
	}

	var sub *nats.Subscription
	var err error

	if queue != "" {
		sub, err = j.js.QueueSubscribe(subject, queue, callback, opts...)
	} else {
		sub, err = j.js.Subscribe(subject, callback, opts...)
	}

	if err != nil {
		return nil, fmt.Errorf("failed to create jetstream subscription: %w", err)
	}

	// Handle context cancellation to automatically unsubscribe
	go func() {
		<-ctx.Done()
		_ = sub.Unsubscribe()
	}()

	return &jetStreamSubscription{sub: sub}, nil
}
