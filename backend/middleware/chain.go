package middleware

import (
	"bufio"
	"net"
	"net/http"
)

// Middleware signature for standard http.HandlerFunc
type Middleware func(http.HandlerFunc) http.HandlerFunc

// Chain composes middlewares left-to-right
// Usage: Chain(logging, auth, rateLimit)(finalHandler)
func Chain(middlewares ...Middleware) Middleware {
	return func(final http.HandlerFunc) http.HandlerFunc {
		for i := len(middlewares) - 1; i >= 0; i-- {
			final = middlewares[i](final)
		}
		return final
	}
}

// HandlerMiddleware signature for standard http.Handler (useful for broader middleware chains)
type HandlerMiddleware func(http.Handler) http.Handler

// ChainHandler composes http.Handler middlewares left-to-right
func ChainHandler(middlewares ...HandlerMiddleware) HandlerMiddleware {
	return func(final http.Handler) http.Handler {
		for i := len(middlewares) - 1; i >= 0; i-- {
			final = middlewares[i](final)
		}
		return final
	}
}

// ResponseWriterWithStatus wraps http.ResponseWriter to capture status codes and bytes written
type ResponseWriterWithStatus struct {
	http.ResponseWriter
	Status       int
	BytesWritten int64
	wroteHeader  bool
}

// WrapResponseWriter ensures we can capture handler’s response status
func WrapResponseWriter(w http.ResponseWriter) *ResponseWriterWithStatus {
	return &ResponseWriterWithStatus{
		ResponseWriter: w,
		Status:         http.StatusOK, // Default to 200 OK
	}
}

func (rw *ResponseWriterWithStatus) WriteHeader(code int) {
	if !rw.wroteHeader {
		rw.Status = code
		rw.wroteHeader = true
		rw.ResponseWriter.WriteHeader(code)
	}
}

func (rw *ResponseWriterWithStatus) Write(b []byte) (int, error) {
	if !rw.wroteHeader {
		rw.WriteHeader(http.StatusOK)
	}
	n, err := rw.ResponseWriter.Write(b)
	rw.BytesWritten += int64(n)
	return n, err
}

// Flush implements http.Flusher to prevent breaking streaming/SSE endpoints
func (rw *ResponseWriterWithStatus) Flush() {
	if flusher, ok := rw.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

// Hijack implements http.Hijacker to prevent breaking WebSocket connections
func (rw *ResponseWriterWithStatus) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	if hijacker, ok := rw.ResponseWriter.(http.Hijacker); ok {
		return hijacker.Hijack()
	}
	return nil, nil, http.ErrNotSupported
}
