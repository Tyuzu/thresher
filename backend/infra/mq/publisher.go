package mq

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// EventEnvelope is a standardized wrapper for all published events.
type EventEnvelope struct {
	ID        string          `json:"id"`
	Type      string          `json:"type"`
	Timestamp int64           `json:"timestamp"`
	Source    string          `json:"source,omitempty"`
	TraceID   string          `json:"trace_id,omitempty"`
	Payload   json.RawMessage `json:"payload"`
}

// PublishWithMeta marshals payload into an EventEnvelope, attaches metadata (id, timestamp,
// optional trace id from context) and publishes using the provided MQ. It retries a few
// times with simple backoff on transient failures.
func PublishWithMeta(ctx context.Context, m MQ, subject string, payload interface{}) error {
	if m == nil {
		return fmt.Errorf("mq client is nil")
	}

	raw, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}

	env := EventEnvelope{
		ID:        uuid.NewString(),
		Type:      subject,
		Timestamp: time.Now().Unix(),
		Payload:   json.RawMessage(raw),
	}

	// Optional trace id if set in context using key "trace_id"
	if v := ctx.Value("trace_id"); v != nil {
		if s, ok := v.(string); ok && s != "" {
			env.TraceID = s
		}
	}

	// Optional source
	if v := ctx.Value("service_name"); v != nil {
		if s, ok := v.(string); ok && s != "" {
			env.Source = s
		}
	}

	data, err := json.Marshal(env)
	if err != nil {
		return fmt.Errorf("marshal envelope: %w", err)
	}

	// Simple retry/backoff
	var lastErr error
	backoff := 100 * time.Millisecond
	for i := 0; i < 4; i++ {
		if err := m.Publish(ctx, subject, data); err == nil {
			return nil
		} else {
			lastErr = err
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(backoff):
			}
			backoff *= 2
		}
	}
	return fmt.Errorf("publish failed after retries: %w", lastErr)
}

// UnpackEnvelope unmarshals bytes into EventEnvelope and returns it.
func UnpackEnvelope(data []byte) (*EventEnvelope, error) {
	var env EventEnvelope
	if err := json.Unmarshal(data, &env); err != nil {
		return nil, err
	}
	return &env, nil
}
