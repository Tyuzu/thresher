package profile

import (
	"encoding/json"
	"net/http"

	"naevis/infra"
	"naevis/profile/repo"
	pu "naevis/profile/usecase"
	"naevis/utils"
)

/* -------------------------------------------------------
   Get Own Profile
------------------------------------------------------- */

func GetProfile(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB, app.Cache)
	uc := pu.NewProfileUsecase(repoImpl)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		requestingUserID := utils.GetUserIDFromRequest(r)

		user, err := uc.GetOwnProfile(ctx, requestingUserID)
		if err != nil || user.UserID == "" {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		// Populate follow counts and online via repo/usecase
		userFollow, _ := repoImpl.GetUserFollowData(ctx, user.UserID)
		user.FollowersCount = len(userFollow.Followers)
		user.FollowingCount = len(userFollow.Follows)
		user.Online, _ = repoImpl.IsOnline(ctx, user.UserID)

		profileJSON, err := json.Marshal(user)
		if err != nil {
			http.Error(w, "Encoding failed", http.StatusInternalServerError)
			return
		}

		// Best-effort cache write (5 min TTL)
		_ = repoImpl.CacheProfile(ctx, user.Username, string(profileJSON), int64(5*60))

		utils.RespondWithJSON(w, http.StatusOK, user)
	}
}

/* -------------------------------------------------------
   Get Another User's Profile
------------------------------------------------------- */

func GetUserProfile(app *infra.Deps) http.HandlerFunc {
	repoImpl := repo.NewMongoRepo(app.DB, app.Cache)
	uc := pu.NewProfileUsecase(repoImpl)

	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		claims, err := validateJWT(r)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		username := utils.GetParam(r, "username")

		_, response, err := uc.GetUserProfile(ctx, username, claims.UserID)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, response)
	}
}
