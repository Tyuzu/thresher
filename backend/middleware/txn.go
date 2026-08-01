package middleware

import (
	"net/http"
)

func WithTxn(next http.HandlerFunc) http.HandlerFunc {
	return next
}
