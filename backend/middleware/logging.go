package middleware

import (
	"net/http"
	"time"

	"naevis/utils/logger"
)

// loggingMiddleware logs each request method, path, remote address, and duration.
func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		duration := time.Since(start)
		logger.L.Sugar().Infow("http_request", "method", r.Method, "uri", r.RequestURI, "remote", r.RemoteAddr, "duration_ms", duration.Milliseconds())
	})
}
