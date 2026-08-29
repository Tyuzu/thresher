package ads

import (
	"context"
	"encoding/json"
	"net/http"

	"scav/infra"
	"scav/utils"

	"github.com/julienschmidt/httprouter"
)

type PromotePostRequest struct {
	PostID   string `json:"postId"`
	Page     string `json:"page"`
	Position string `json:"position"`
	Category string `json:"category"`
}

// CreateAd handles direct ad creation.
func CreateAd(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var ad Ad
		if err := json.NewDecoder(r.Body).Decode(&ad); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
			return
		}

		if err := CreateAdInDB(r.Context(), app, &ad); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to create ad")
			return
		}

		invalidateAdCache(r.Context(), app)
		utils.RespondWithJSON(w, http.StatusCreated, ad)
	}
}

// PromotePostToAd converts an existing platform post into an ad.
func PromotePostToAd(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req PromotePostRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.PostID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Post ID is required")
			return
		}

		ad, err := PromotePostInDB(r.Context(), app, req.PostID, req.Page, req.Position, req.Category)
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, err.Error())
			return
		}

		invalidateAdCache(r.Context(), app)
		utils.RespondWithJSON(w, http.StatusCreated, ad)
	}
}

// UpdateAd updates target fields for a given ad ID.
func UpdateAd(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		params := httprouter.ParamsFromContext(r.Context())
		adID := params.ByName("id")

		var updateData map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Invalid payload")
			return
		}

		if err := UpdateAdInDB(r.Context(), app, adID, updateData); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to update ad")
			return
		}

		invalidateAdCache(r.Context(), app)
		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Ad updated successfully"})
	}
}

// DeleteAd soft-deletes or hard-deletes an ad.
func DeleteAd(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		params := httprouter.ParamsFromContext(r.Context())
		adID := params.ByName("id")

		if err := DeleteAdInDB(r.Context(), app, adID); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to delete ad")
			return
		}

		invalidateAdCache(r.Context(), app)
		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Ad removed successfully"})
	}
}

// Helper to invalidate cached ad configurations.
func invalidateAdCache(ctx context.Context, app *infra.Deps) {
	if app != nil && app.Cache != nil {
		_ = app.Cache.FlushPattern(ctx, "ads:*")
	}
}

// ListAds returns all advertisements (both active and inactive) for admin management.
func ListAds(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var ads []Ad

		// Fetch all ads without status filtering
		err := app.DB.FindMany(r.Context(), adsCollection, map[string]interface{}{}, &ads)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to fetch ads list")
			return
		}

		if ads == nil {
			ads = []Ad{}
		}

		utils.RespondWithJSON(w, http.StatusOK, ads)
	}
}

// GetAdByID retrieves a single ad by its ID.
func GetAdByID(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		params := httprouter.ParamsFromContext(r.Context())
		adID := params.ByName("id")

		if adID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Ad ID is required")
			return
		}

		ad, err := GetAdByIDFromDB(r.Context(), app, adID)
		if err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "Ad not found")
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, ad)
	}
}
