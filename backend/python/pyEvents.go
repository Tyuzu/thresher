package python

import (
	"bytes"
	"context"
	"log"
	"net/http"
	"time"
)

// Shared HTTP client reuses TCP connections for better performance.
var defaultHTTPClient = &http.Client{
	Timeout: 3 * time.Second,
}

// sendToFlaskServerAsync fires an HTTP POST request in the background.
// It uses a detached context so parent context cancellations won't abort the Flask call.
func SendToFlaskServerAsync(data []byte) {
	endpoint := "http://127.0.0.1:5000/events"

	// Copy data buffer to avoid race conditions if caller mutates it
	payloadCopy := make([]byte, len(data))
	copy(payloadCopy, data)

	go func() {
		// Use a fresh context with a dedicated timeout for the background work
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()

		req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewBuffer(payloadCopy))
		if err != nil {
			log.Printf("async flask call failed to create request: %v", err)
			return
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := defaultHTTPClient.Do(req)
		if err != nil {
			log.Printf("async flask call failed: %v", err)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			log.Printf("async flask call returned status %d", resp.StatusCode)
		}
	}()
}
