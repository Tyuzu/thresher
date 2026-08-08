package deliveries

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

type contextKey string

const (
	UserIDKey   contextKey = "user_id"
	TenantIDKey contextKey = "tenant_id"
	DriverIDKey contextKey = "driver_id"
)

func GenerateRandomString(length int) string {
	bytes := make([]byte, length/2)
	_, _ = rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

func GetUserIDFromContext(ctx context.Context) string {
	if val, ok := ctx.Value(UserIDKey).(string); ok {
		return val
	}
	return ""
}

func GetTenantIDFromContext(ctx context.Context) string {
	if val, ok := ctx.Value(TenantIDKey).(string); ok {
		return val
	}
	return ""
}

func GetDriverIDFromContext(ctx context.Context) string {
	if val, ok := ctx.Value(DriverIDKey).(string); ok {
		return val
	}
	return ""
}

func GetParam(r *http.Request, key string) string {
	params := httprouter.ParamsFromContext(r.Context())
	return params.ByName(key)
}

func RespondWithJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		_ = json.NewEncoder(w).Encode(data)
	}
}

func RespondWithError(w http.ResponseWriter, status int, message string) {
	RespondWithJSON(w, status, map[string]string{"error": message})
}
