package feed

import (
	"naevis/dels"
	"naevis/infra"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

// DELETE /api/v1/feed/post/:postid
func DeletePost(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {

		// ctx := r.Context()

		postID := ps.ByName("postid")
		if postID == "" {
			http.Error(w, "postid is required", http.StatusBadRequest)
			return
		}
		dels.DeletePost(app)
	}
}
