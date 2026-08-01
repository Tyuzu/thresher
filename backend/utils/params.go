package utils

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

// GetParams extracts URL path parameters populated by httprouter from r.Context().
func GetParams(r *http.Request) httprouter.Params {
	return httprouter.ParamsFromContext(r.Context())
}

// GetParam returns a specific path parameter by key, or empty string if not found.
func GetParam(r *http.Request, key string) string {
	ps := httprouter.ParamsFromContext(r.Context())
	return ps.ByName(key)
}
