package feed

import (
	"naevis/beats/dels"
	"naevis/infra"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

var deletePostFactory = dels.DeletePost

// DELETE /api/v1/feed/post/:postid
func DeletePost(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		postID := ps.ByName("postid")
		if postID == "" {
			http.Error(w, "postid is required", http.StatusBadRequest)
			return
		}
		deletePostFactory(app)(w, r, ps)
	}
}
