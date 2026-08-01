package tickets

import (
	"context"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"
	"net/http"
	"time"
)

// GetAvailableSeats returns the list of available seats for an event
func GetAvailableSeats(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		eventID := utils.GetParam(r, "eventid")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		// Structure matches DB document
		var ticket struct {
			Seats []struct {
				SeatID string `bson:"seat_id"`
				Status string `bson:"status"`
			} `bson:"seats"`
		}

		err := app.DB.FindOne(ctx, ticketsCollection, map[string]any{"event_id": eventID}, &ticket)
		if err != nil {
			http.Error(w, `{"error": "No tickets found for this event"}`, http.StatusNotFound)
			return
		}

		availableSeats := make([]string, 0, len(ticket.Seats))
		for _, seat := range ticket.Seats {
			if seat.Status == "available" {
				availableSeats = append(availableSeats, seat.SeatID)
			}
		}

		// Ensure empty slice instead of nil
		if availableSeats == nil {
			availableSeats = []string{}
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{"seats": availableSeats})
	}
}

// GetTicketSeats returns the seats for a specific ticket
func GetTicketSeats(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		eventID := utils.GetParam(r, "eventid")
		ticketID := utils.GetParam(r, "ticketid")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var ticket models.Ticket
		err := app.DB.FindOne(ctx, ticketsCollection, map[string]any{
			"eventid":  eventID,
			"ticketid": ticketID,
		}, &ticket)

		if err != nil {
			http.Error(w, "Ticket not found", http.StatusNotFound)
			return
		}

		// Ensure empty slice if Seats is nil
		if ticket.Seats == nil {
			ticket.Seats = []models.Seat{}
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"success": true,
			"seats":   ticket.Seats,
		})
	}
}
