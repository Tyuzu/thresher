package artists

import (
	"encoding/json"
	"naevis/beats/dels"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/models"
	"naevis/utils"
	"net/http"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

func CreateArtistEvent(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()

		var artistevent models.ArtistEvent
		if err := json.NewDecoder(r.Body).Decode(&artistevent); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, ErrInvalidPayload.Error())
			return
		}

		artistevent.ArtistID = ps.ByName("id")

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

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.ArtistEventCreatedEvent, mqevent.ArtistEventCreatePayload{})

		utils.RespondWithJSON(w, http.StatusCreated, map[string]interface{}{
			"message": "ArtistEvent created successfully",
			"id":      artistevent.EventID,
		})
	}
}

// Update Artist Event
func UpdateArtistEvent(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		artisteventID := ps.ByName("id")

		var updateData bson.M
		if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, ErrInvalidPayload.Error())
			return
		}

		err := UpdateArtistEventByID(ctx, app.DB, artisteventID, updateData)
		if err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "ArtistEvent not found or update failed")
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.ArtistEventUpdatedEvent, mqevent.ArtistEventUpdatePayload{})

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "ArtistEvent updated successfully"})
	}
}

// Delete Artist Event
func DeleteArtistEvent(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		dels.DeleteArtistEvent(app)(w, r, ps)
		// artisteventID := ps.ByName("id")

		// result, err := app.DB.ArtistEventsCollection.DeleteOne(context.TODO(), bson.M{"eventid": artisteventID})
		// if err != nil || result.DeletedCount == 0 {
		// 	utils.RespondWithError(w, http.StatusNotFound, "ArtistEvent not found or deletion failed")
		// 	return
		// }

		// mqpayload, _ := json.Marshal(mqevent.DummyPayload{})
		// app.MQ.Publish(ctx, mqevent.DummyEvent, mqpayload)

		// utils.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "ArtistEvent deleted successfully"})
	}
}

func AddArtistToEvent(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()
		type RequestPayload struct {
			EventID  string `json:"eventid"`
			ArtistID string `json:"artistid"`
		}

		var payload RequestPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, ErrInvalidPayload.Error())
			return
		}

		// Get artist ID from URL parameter if passed
		payload.ArtistID = ps.ByName("id")

		// Fetch event details from EventsCollection
		var event models.Event
		err := FindEventByID(ctx, app.DB, payload.EventID, &event)
		if err != nil {
			utils.RespondWithError(w, http.StatusNotFound, "Event not found")
			return
		}

		// Check if ArtistEvent already exists
		var existing []models.ArtistEvent
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
		artistEvent := models.ArtistEvent{
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

		err = AddArtistToEventDB(ctx, app.DB, artistEvent)
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "Failed to add artist to artist events")
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.ArtistAddedToEvent, mqevent.ArtistAddedToEventPayload{})

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Artist successfully added to event"})
	}
}
