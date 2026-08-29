package media

import (
	"scav/infra"
	"net/http"
)

// ---------------------- Delete Media ----------------------
func DeleteMedia(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
	}
}
