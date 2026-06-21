package media

import (
	"naevis/beats/dels"
	"naevis/infra"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

// ---------------------- Delete Media ----------------------
func DeleteMedia(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		dels.DeleteMedia(app)
	}
}
