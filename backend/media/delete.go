package media

import (
	"naevis/beats/dels"
	"naevis/infra"
	"net/http"
)

// ---------------------- Delete Media ----------------------
func DeleteMedia(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		dels.DeleteMedia(app)
	}
}
