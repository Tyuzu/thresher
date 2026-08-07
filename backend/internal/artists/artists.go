package artists

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"

	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/utils"
)

func CreateArtist(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		if err := r.ParseMultipartForm(10 << 20); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Failed to parse form data")
			return
		}

		artist, _, _, err := parseArtistFormData(r, nil)
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, err.Error())
			return
		}

		artist.ArtistID = utils.GenerateRandomString(12)
		artist.EventIDs = []string{}

		if err := InsertArtist(ctx, app.DB, &artist); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to create artist")
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.ArtistCreatedEvent, mqevent.ArtistCreatedPayload{})
		utils.RespondWithJSON(w, http.StatusCreated, artist)
	}
}

func UpdateArtist(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		idParam := utils.GetParam(r, "id")

		if err := r.ParseMultipartForm(20 << 20); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "Failed to parse form data")
			return
		}

		var existing Artist
		if err := FindArtistByID(ctx, app.DB, idParam, &existing); err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "Artist not found")
			return
		}

		_, updateData, filesToDelete, err := parseArtistFormData(r, &existing)
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, err.Error())
			return
		}

		if len(updateData) == 0 {
			utils.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "No changes detected"})
			return
		}

		if _, err := UpdateArtistByID(ctx, app.DB, idParam, updateData); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to update artist")
			return
		}

		for _, path := range filesToDelete {
			_ = os.Remove(path)
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.ArtistUpdatedEvent, mqevent.ArtistUpdatedPayload{})
		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Artist updated"})
	}
}

func parseArtistFormData(r *http.Request, existing *Artist) (Artist, map[string]any, []string, error) {
	var artist Artist
	updateData := map[string]any{}
	filesToDelete := []string{}

	if existing != nil {
		artist = *existing
	}

	assignField := func(key string, target *string, existingVal string) {
		if val := strings.TrimSpace(r.FormValue(key)); val != "" {
			*target = val
			updateData[key] = val
		} else {
			*target = existingVal
		}
	}

	var name, bio, category, dob, place, country string
	if existing != nil {
		name, bio, category = existing.Name, existing.Bio, existing.Category
		dob, place, country = existing.DOB, existing.Place, existing.Country
	}

	assignField("name", &artist.Name, name)
	assignField("bio", &artist.Bio, bio)
	assignField("category", &artist.Category, category)
	assignField("dob", &artist.DOB, dob)
	assignField("place", &artist.Place, place)
	assignField("country", &artist.Country, country)

	if creatorID := utils.GetUserIDFromRequest(r); creatorID != "" {
		artist.CreatorID = creatorID
		updateData["creatorid"] = creatorID
	}

	if val := r.FormValue("genres"); val != "" {
		var genres []string
		for _, g := range strings.Split(val, ",") {
			if trimmed := strings.TrimSpace(g); trimmed != "" {
				genres = append(genres, trimmed)
			}
		}
		artist.Genres = genres
		updateData["genres"] = genres
	}

	if val := r.FormValue("socials"); val != "" {
		var socials map[string]string
		if err := json.Unmarshal([]byte(val), &socials); err == nil {
			artist.Socials = socials
		} else {
			artist.Socials = map[string]string{"raw": val}
		}
		updateData["socials"] = artist.Socials
	}

	return artist, updateData, filesToDelete, nil
}

func DeleteArtistByID(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {}
}
