package mq

import (
	"context"
	"errors"

	"naevis/utils/logger"
)

type StreamMQ struct {
}

func NewStreamMQ() *StreamMQ {
	return &StreamMQ{}
}

func (j *StreamMQ) Publish(
	ctx context.Context,
	subject string,
	data []byte,
) error {
	logger.L.Sugar().Debugw("mq_publish_noop", "subject", subject, "data_len", len(data))
	return nil
}

func (j *StreamMQ) Ping(ctx context.Context) error {
	// StreamMQ is a no-op MQ used for local/dev; always healthy
	return nil
}

func (j *StreamMQ) Subscribe(
	ctx context.Context,
	subject string,
	handler MessageHandler,
) (Subscription, error) {
	return nil, errors.New("stream MQ does not support subscribe")
}

func (j *StreamMQ) QueueSubscribe(
	ctx context.Context,
	subject string,
	queue string,
	handler MessageHandler,
) (Subscription, error) {
	return nil, errors.New("stream MQ does not support queue subscribe")
}
