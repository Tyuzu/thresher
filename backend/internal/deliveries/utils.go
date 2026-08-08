package deliveries

import (
	"context"
)

type contextKey string

const (
	TenantIDKey contextKey = "tenant_id"
	DriverIDKey contextKey = "driver_id"
)

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
