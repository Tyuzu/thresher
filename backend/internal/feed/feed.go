package feed

import (
	"naevis/infra"
	"naevis/utils"
	"net/http"
)

// DELETE /api/v1/feed/post/:postid
func DeletePost(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		postID := utils.GetParam(r, "postid")
		if postID == "" {
			http.Error(w, "postid is required", http.StatusBadRequest)
			return
		}
	}
}
