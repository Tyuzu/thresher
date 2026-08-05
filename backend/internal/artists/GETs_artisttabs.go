package artists

import (
	"naevis/infra"
	"naevis/internal/media"
	"naevis/internal/merch"
	"naevis/models"
	"naevis/utils"
	"net/http"
)

func GetArtistsAlbums(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		albums := []models.ArtistAlbum{
			{
				Title:       "Nightfall",
				ReleaseDate: "2023-10-01",
				Description: "A journey through dusk.",
				Published:   true,
			},
			{
				Title:       "Drip",
				ReleaseDate: "2025-11-17",
				Description: "A journey till dawn.",
				Published:   true,
			},
			{
				Title:       "Unreleased Gems",
				ReleaseDate: "2025-01-01",
				Description: "Upcoming exclusives.",
				Published:   false,
			},
		}

		utils.RespondWithJSON(w, http.StatusOK, albums)
	}
}

func GetArtistsPosts(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		media.GetMedias(app)(w, r)
	}
}

func GetArtistsMerch(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		merch.GetMerchs(app)(w, r)
	}
}
