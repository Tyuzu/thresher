package media

import (
	"naevis/infra"
	"naevis/internal/beats/dels"
	"net/http"
)

// ---------------------- Delete Media ----------------------
func DeleteMedia(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		dels.DeleteMedia(app)
	}
}
