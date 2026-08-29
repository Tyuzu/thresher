package comments

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"go.mongodb.org/mongo-driver/bson"

	"scav/infra"
	"scav/infra/db"
	"scav/utils"
)

/* =========================
   GET SINGLE COMMENT
========================= */

func GetComment(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		commentID := utils.GetParam(r, "commentid")
		if commentID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid comment ID")
			return
		}

		var comment Comment
		err := findCommentByID(ctx, app.DB, commentID, &comment)
		if err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "Comment not found")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, comment)
	}
}

/*
	=========================
	  GET COMMENTS (PAGINATED)

=========================
*/
func GetComments(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		entityType := utils.GetParam(r, "entitytype")
		entityID := utils.GetParam(r, "entityid")

		if entityID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Entity ID is required")
			return
		}

		if !isValidEntityType(entityType) {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid entity type")
			return
		}

		/* ---------- Pagination ---------- */
		page := 1
		limit := 10

		if v := r.URL.Query().Get("page"); v != "" {
			if p, err := strconv.Atoi(v); err == nil && p > 0 {
				page = p
			}
		}

		if v := r.URL.Query().Get("limit"); v != "" {
			if l, err := strconv.Atoi(v); err == nil && l > 0 && l <= 50 {
				limit = l
			}
		}

		skip := (page - 1) * limit
		sortBy := r.URL.Query().Get("sort") // new | old | likes

		/* ---------- Sorting (ORDERED) ---------- */
		sort := bson.D{
			{Key: "created_at", Value: -1},
			{Key: "commentid", Value: -1},
		}

		switch sortBy {
		case "old":
			sort = bson.D{
				{Key: "created_at", Value: 1},
				{Key: "commentid", Value: 1},
			}
		case "likes":
			sort = bson.D{
				{Key: "likes", Value: -1},
				{Key: "created_at", Value: -1},
			}
		}

		opts := db.FindManyOptions{
			Limit: limit,
			Skip:  skip,
			Sort:  sort,
		}

		var comments []Comment
		if err := findCommentsByEntity(ctx, app.DB, entityType, entityID, opts, &comments); err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, map[string]string{"message": "Failed to fetch comments"})
			return
		}

		// Always return array (never null)
		if comments == nil {
			comments = []Comment{}
		}

		utils.RespondWithJSON(w, http.StatusOK, comments)
	}
}
