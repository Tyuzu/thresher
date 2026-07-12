package mq

import (
	"context"
	"errors"
	"log"
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
	log.Printf("--> : %s ::: %v", subject, string(data))
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
