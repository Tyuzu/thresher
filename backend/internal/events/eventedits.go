package events

import (
	"context"
	"scav/config/mqevent"
	"scav/infra"
	"scav/infra/mq"
	"scav/utils"
	log "scav/utils/logger"
	"net/http"
	"time"
)

// EditEvent updates an existing event
func EditEvent(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		eventID := utils.GetParam(r, "eventid")
		if eventID == "" {
			http.Error(w, "Missing event ID", http.StatusBadRequest)
			return
		}

		updateFields, err := updateEventFields(r)
		if err != nil {
			log.Printf("Invalid update fields for event %s: %v", eventID, err)
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if err := validateUpdateFields(updateFields); err != nil {
			log.Printf("Validation failed for event %s: %v", eventID, err)
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		updateFields["updated_at"] = time.Now().UTC()

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		if _, err := updateEvent(ctx, app, eventID, updateFields); err != nil {
			log.Printf("Error updating event %s: %v", eventID, err)
			http.Error(w, "Error updating event", http.StatusInternalServerError)
			return
		}

		var updatedEvent Event
		if err := findEventByID(ctx, app, eventID, &updatedEvent); err != nil {
			http.Error(w, "Error retrieving updated event", http.StatusInternalServerError)
			return
		}

		if err := mq.PublishWithMeta(ctx, app.MQ, mqevent.EventUpdatedEvent, mqevent.EventUpdatedPayload{}); err != nil {
			log.Printf("failed to publish event updated event: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusOK, updatedEvent)
	}
}

// DeleteEvent deletes an event and its related data
func DeleteEvent(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

	}
}
