package artists

import (
	"encoding/json"
	"net/http"

	"scav/config/mqevent"
	"scav/infra"
	"scav/infra/mq"
	"scav/internal/events"
	"scav/utils"
)

func CreateArtistEvent(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		var artistevent ArtistEvent
		if err := json.NewDecoder(r.Body).Decode(&artistevent); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, ErrInvalidPayload.Error())
			return
		}

		artistevent.ArtistID = utils.GetParam(r, "id")
		artistevent.CreatorID = utils.GetUserIDFromRequest(r)
		artistevent.EventID = utils.GenerateRandomString(14)

		err := InsertArtistEvent(ctx, app.DB, &artistevent)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, ErrDatabase.Error())
			return
		}

		if err := AddEventToDB(ctx, app, artistevent); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to add event")
			return
		}

		// Publish MQ event with payload details
		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.ArtistEventCreatedEvent, mqevent.ArtistEventCreatedPayload{
			EventID:  artistevent.EventID,
			ArtistID: artistevent.ArtistID,
		})

		utils.RespondWithJSON(w, http.StatusCreated, map[string]any{
			"message": "ArtistEvent created successfully",
			"id":      artistevent.EventID,
		})
	}
}

// Update Artist Event
func UpdateArtistEvent(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		artisteventID := utils.GetParam(r, "id")

		var updateData map[string]any
		if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, ErrInvalidPayload.Error())
			return
		}

		_, err := UpdateArtistEventByID(ctx, app.DB, artisteventID, updateData)
		if err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "ArtistEvent not found or update failed")
			return
		}

		// Publish MQ event after successful update
		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.ArtistEventUpdatedEvent, mqevent.ArtistEventUpdatedPayload{
			EventID: artisteventID,
		})

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "ArtistEvent updated successfully"})
	}
}

// Delete Artist Event
func DeleteArtistEvent(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		artisteventID := utils.GetParam(r, "id")

		err := DeleteArtistEventByID(ctx, app.DB, artisteventID)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to delete ArtistEvent")
			return
		}

		// Added MQ event trigger for deletion
		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.ArtistEventDeletedEvent, mqevent.ArtistEventDeletedPayload{
			EventID: artisteventID,
		})

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "ArtistEvent deleted successfully"})
	}
}

func AddArtistToEvent(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		var payload ArtistToEventRequestPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, ErrInvalidPayload.Error())
			return
		}

		// Get artist ID from URL parameter if passed
		payload.ArtistID = utils.GetParam(r, "id")

		// Fetch event details from EventsCollection
		var event events.Event
		err := FindEventByID(ctx, app.DB, payload.EventID, &event)
		if err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "Event not found")
			return
		}

		// Check if ArtistEvent already exists
		var existing []ArtistEvent
		err = FindArtistEventsByEventAndArtist(ctx, app.DB, payload.EventID, payload.ArtistID, &existing)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Error checking for existing artist event")
			return
		}
		if len(existing) > 0 {
			utils.RespondWithError(w, http.StatusConflict, "Artist already added to this event")
			return
		}

		// Create a new ArtistEvent object
		artistEvent := ArtistEvent{
			EventID:   event.EventID,
			ArtistID:  payload.ArtistID,
			Title:     event.Title,
			Date:      event.Date.Format("2006-01-02"),
			Venue:     event.PlaceName,
			City:      "",
			Country:   "",
			CreatorID: event.CreatorID,
			TicketURL: event.WebsiteURL,
		}

		_, err = AddArtistToEventDB(ctx, app.DB, artistEvent)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to add artist to artist events")
			return
		}

		// Publish MQ event with specific field context
		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.ArtistAddedToEvent, mqevent.ArtistAddedToEventPayload{
			EventID:  artistEvent.EventID,
			ArtistID: artistEvent.ArtistID,
		})

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Artist successfully added to event"})
	}
}
