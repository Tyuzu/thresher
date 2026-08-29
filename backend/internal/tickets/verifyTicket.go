package tickets

import (
	"context"
	"fmt"
	"scav/infra"
	"scav/utils"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

func VerifyTicket(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		eventID := utils.GetParam(r, "eventid")
		uniqueCode := r.URL.Query().Get("uniqueCode")

		if uniqueCode == "" {
			http.Error(w, "Unique code is required for verification", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var ticket PurchasedTicket
		if err := app.DB.FindOne(
			ctx,
			purchasedTicketsCollection,
			bson.M{
				"eventid":    eventID,
				"uniquecode": uniqueCode,
			},
			&ticket,
		); err != nil {
			http.Error(w, fmt.Sprintf("Ticket verification failed: %v", err), http.StatusNotFound)
			return
		}

		// SECURITY: Check if ticket has been canceled
		if ticket.Canceled {
			utils.RespondWithJSON(w, http.StatusOK, map[string]any{
				"isValid":      false,
				"reason":       "Ticket has been canceled",
				"canceledAt":   ticket.CanceledAt,
				"cancelReason": ticket.CanceledReason,
			})
			return
		}

		// SECURITY: Check if ticket has been transferred
		if ticket.Transferred {
			utils.RespondWithJSON(w, http.StatusOK, map[string]any{
				"isValid":       false,
				"reason":        "Ticket has been transferred",
				"transferredTo": ticket.TransferredTo,
			})
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]bool{
			"isValid": true,
		})
	}
}
