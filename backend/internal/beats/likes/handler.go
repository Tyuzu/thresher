package likes

import (
	"context"
	"errors"
	"net/http"
	"time"

	"scav/infra"
	"scav/utils"
)

// Helper constructor to instantiate the service with its repository setup
func newServiceWithRepo(app *infra.Deps) *Service {
	repo := NewMongoRepository(app)
	return NewService(app, repo)
}

func LikeEntity(app *infra.Deps) http.HandlerFunc {
	service := newServiceWithRepo(app)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(
			r.Context(),
			3*time.Second,
		)
		defer cancel()

		userID := utils.GetUserIDFromRequest(r)

		if userID == "" {
			http.Error(
				w,
				"Unauthorized: user not found",
				http.StatusUnauthorized,
			)
			return
		}

		entityType := utils.GetParam(r, "entitytype")
		entityID := utils.GetParam(r, "entityid")

		if entityType == "" || entityID == "" {
			http.Error(
				w,
				"Bad Request",
				http.StatusBadRequest,
			)
			return
		}

		if !IsValidEntityType(entityType) {
			http.Error(
				w,
				"Invalid entity type",
				http.StatusBadRequest,
			)
			return
		}

		count, err := service.Like(
			ctx,
			userID,
			entityType,
			entityID,
		)

		if err != nil {
			// Handle duplicate key error domain-wise without referencing mongo package
			if errors.Is(err, ErrAlreadyLiked) {
				count, countErr := service.Count(
					ctx,
					entityType,
					entityID,
				)

				if countErr != nil {
					http.Error(
						w,
						"Failed to get like count",
						http.StatusInternalServerError,
					)
					return
				}

				utils.RespondWithJSON(
					w,
					http.StatusOK,
					map[string]any{
						"liked": true,
						"count": count,
					},
				)
				return
			}

			http.Error(
				w,
				"Failed to like",
				http.StatusInternalServerError,
			)
			return
		}

		utils.RespondWithJSON(
			w,
			http.StatusOK,
			map[string]any{
				"liked": true,
				"count": count,
			},
		)
	}
}

func UnlikeEntity(app *infra.Deps) http.HandlerFunc {
	service := newServiceWithRepo(app)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(
			r.Context(),
			3*time.Second,
		)
		defer cancel()

		userID := utils.GetUserIDFromRequest(r)

		if userID == "" {
			http.Error(
				w,
				"Unauthorized: user not found",
				http.StatusUnauthorized,
			)
			return
		}

		entityType := utils.GetParam(r, "entitytype")
		entityID := utils.GetParam(r, "entityid")

		if entityType == "" || entityID == "" {
			http.Error(
				w,
				"Bad Request",
				http.StatusBadRequest,
			)
			return
		}

		if !IsValidEntityType(entityType) {
			http.Error(
				w,
				"Invalid entity type",
				http.StatusBadRequest,
			)
			return
		}

		count, err := service.Unlike(
			ctx,
			userID,
			entityType,
			entityID,
		)

		if err != nil {
			if errors.Is(err, ErrNotLiked) {
				count, countErr := service.Count(
					ctx,
					entityType,
					entityID,
				)

				if countErr != nil {
					http.Error(
						w,
						"Failed to get like count",
						http.StatusInternalServerError,
					)
					return
				}

				utils.RespondWithJSON(
					w,
					http.StatusOK,
					map[string]any{
						"liked": false,
						"count": count,
					},
				)
				return
			}

			http.Error(
				w,
				"Failed to unlike",
				http.StatusInternalServerError,
			)
			return
		}

		utils.RespondWithJSON(
			w,
			http.StatusOK,
			map[string]any{
				"liked": false,
				"count": count,
			},
		)
	}
}

func GetLikeCount(app *infra.Deps) http.HandlerFunc {
	service := newServiceWithRepo(app)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(
			r.Context(),
			2*time.Second,
		)
		defer cancel()

		entityType := utils.GetParam(r, "entitytype")
		entityID := utils.GetParam(r, "entityid")

		if entityType == "" || entityID == "" {
			http.Error(
				w,
				"Bad Request",
				http.StatusBadRequest,
			)
			return
		}

		if !IsValidEntityType(entityType) {
			http.Error(
				w,
				"Invalid entity type",
				http.StatusBadRequest,
			)
			return
		}

		count, err := service.Count(
			ctx,
			entityType,
			entityID,
		)

		if err != nil {
			http.Error(
				w,
				"Count failed",
				http.StatusInternalServerError,
			)
			return
		}

		utils.RespondWithJSON(
			w,
			http.StatusOK,
			map[string]int64{
				"count": count,
			},
		)
	}
}

func GetUserLike(app *infra.Deps) http.HandlerFunc {
	service := newServiceWithRepo(app)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(
			r.Context(),
			2*time.Second,
		)
		defer cancel()

		userID := utils.GetUserIDFromRequest(r)

		if userID == "" {
			http.Error(
				w,
				"Unauthorized: user not found",
				http.StatusUnauthorized,
			)
			return
		}

		entityType := utils.GetParam(r, "entitytype")
		entityID := utils.GetParam(r, "entityid")

		if entityType == "" || entityID == "" {
			http.Error(
				w,
				"Bad Request",
				http.StatusBadRequest,
			)
			return
		}

		if !IsValidEntityType(entityType) {
			http.Error(
				w,
				"Invalid entity type",
				http.StatusBadRequest,
			)
			return
		}

		liked, err := service.IsLiked(
			ctx,
			userID,
			entityType,
			entityID,
		)

		if err != nil {
			http.Error(
				w,
				"Failed to check like",
				http.StatusInternalServerError,
			)
			return
		}

		utils.RespondWithJSON(
			w,
			http.StatusOK,
			map[string]bool{
				"liked": liked,
			},
		)
	}
}
