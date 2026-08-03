package events

import (
	"context"
	"net/http"
	"time"

	"naevis/beats/dels"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/utils"
	log "naevis/utils/logger"
)

// EditEvent updates an existing event and publishes an event updated payload.
func EditEvent(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		eventID := utils.GetParam(r, "eventid")
		if eventID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Missing event ID")
			return
		}

		updateFields, err := updateEventFields(r)
		if err != nil {
			log.Printf("Invalid update fields for event %s: %v", eventID, err)
			utils.RespondWithError(w, http.StatusBadRequest, err.Error())
			return
		}

		if err := validateUpdateFields(updateFields); err != nil {
			log.Printf("Validation failed for event %s: %v", eventID, err)
			utils.RespondWithError(w, http.StatusBadRequest, err.Error())
			return
		}

		now := time.Now().UTC()
		updateFields["updated_at"] = now

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		if err := UpdateEvent(ctx, app, eventID, updateFields); err != nil {
			log.Printf("Error updating event %s: %v", eventID, err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Error updating event")
			return
		}

		updatedEvent, err := FindEventByID(ctx, app, eventID)
		if err != nil {
			log.Printf("Error retrieving updated event %s: %v", eventID, err)
			utils.RespondWithError(w, http.StatusInternalServerError, "Error retrieving updated event")
			return
		}

		// Publish event updated message asynchronously
		payload := mqevent.EventUpdatedPayload{
			EventID:   eventID,
			UpdatedAt: now,
		}
		if err := mq.PublishWithMeta(ctx, app.MQ, mqevent.EventUpdatedEvent, payload); err != nil {
			log.Printf("Failed to publish event updated message for %s: %v", eventID, err)
		}

		utils.RespondWithJSON(w, http.StatusOK, updatedEvent)
	}
}

// DeleteEvent handles the deletion of an event and its related dependencies.
func DeleteEvent(app *infra.Deps) http.HandlerFunc {
	return dels.DeleteEvent(app)
}
