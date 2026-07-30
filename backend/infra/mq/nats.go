package mq

import (
	"context"
	"errors"

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
	return s.sub.Unsubscribe()
}

func (j *JetStreamMQ) Publish(
	ctx context.Context,
	subject string,
	data []byte,
) error {
	if j.js == nil {
		return ErrJetStreamNotInitialized
	}

	msg := &nats.Msg{
		Subject: subject,
		Data:    data,
	}

	_, err := j.js.PublishMsg(msg, nats.Context(ctx))
	return err
}

func (j *JetStreamMQ) Ping(ctx context.Context) error {
	if j.js == nil {
		return ErrJetStreamNotInitialized
	}

	// Fetching JetStream account info is a non-mutating check on JS health
	_, err := j.js.AccountInfo(nats.Context(ctx))
	return err
}

func (j *JetStreamMQ) Subscribe(
	ctx context.Context,
	subject string,
	handler MessageHandler,
) (Subscription, error) {
	if j.js == nil {
		return nil, ErrJetStreamNotInitialized
	}

	sub, err := j.js.Subscribe(
		subject,
		func(msg *nats.Msg) {
			m := Message{
				Subject: msg.Subject,
				Data:    msg.Data,
			}

			// Context for message execution isolated from subscription lifecycle
			if err := handler(context.Background(), m); err != nil {
				_ = msg.Nak()
				return
			}

			_ = msg.Ack()
		},
		nats.ManualAck(),
		nats.AckExplicit(),
	)

	if err != nil {
		return nil, err
	}

	go func() {
		<-ctx.Done()
		_ = sub.Unsubscribe()
	}()

	return &jetStreamSubscription{
		sub: sub,
	}, nil
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

	sub, err := j.js.QueueSubscribe(
		subject,
		queue,
		func(msg *nats.Msg) {
			m := Message{
				Subject: msg.Subject,
				Data:    msg.Data,
			}

			if err := handler(context.Background(), m); err != nil {
				_ = msg.Nak()
				return
			}

			_ = msg.Ack()
		},
		nats.ManualAck(),
		nats.AckExplicit(),
	)

	if err != nil {
		return nil, err
	}

	go func() {
		<-ctx.Done()
		_ = sub.Unsubscribe()
	}()

	return &jetStreamSubscription{
		sub: sub,
	}, nil
}
