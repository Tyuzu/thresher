package tickets

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"naevis/infra"
	"naevis/models"
	"naevis/utils"

	"go.mongodb.org/mongo-driver/bson"
)

func GetTickets(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		eventID := utils.GetParam(r, "eventid")

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var tickets []models.Ticket
		if err := app.DB.FindMany(
			ctx,
			ticketsCollection,
			bson.M{"eventid": eventID},
			&tickets,
		); err != nil {
			http.Error(w, "Failed to fetch tickets", http.StatusInternalServerError)
			return
		}

		if tickets == nil {
			tickets = []models.Ticket{}
		}

		utils.RespondWithJSON(w, http.StatusOK, tickets)
	}
}

// Fetch a single ticket
func GetTicket(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		eventID := utils.GetParam(r, "eventid")
		ticketID := utils.GetParam(r, "ticketid")

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var ticket models.Ticket
		if err := app.DB.FindOne(
			ctx,
			ticketsCollection,
			bson.M{
				"eventid":  eventID,
				"ticketid": ticketID,
			},
			&ticket,
		); err != nil {
			http.Error(w, fmt.Sprintf("Ticket not found: %v", err), http.StatusNotFound)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, ticket)
	}
}
