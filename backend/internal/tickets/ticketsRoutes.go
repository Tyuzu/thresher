package tickets

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the tickets package.

func AddTicketRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Ticket CRUD
	router.HandlerFunc(http.MethodPost, "/api/v1/ticket/event/:eventid", rateLimiter.Limit(authmidware(CreateTicket(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/ticket/event/:eventid", rateLimiter.Limit(GetTickets(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/ticket/event/:eventid/:ticketid", rateLimiter.Limit(GetTicket(app)))
	router.HandlerFunc(http.MethodPut, "/api/v1/ticket/event/:eventid/:ticketid", rateLimiter.Limit(authmidware(EditTicket(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/ticket/event/:eventid/:ticketid", rateLimiter.Limit(authmidware(DeleteTicket(app))))

	// Buying
	router.HandlerFunc(http.MethodPost, "/api/v1/ticket/event/:eventid/:ticketid/buy", rateLimiter.Limit(authmidware(BuyTicket(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/tickets/book", rateLimiter.Limit(authmidware(BuysTicket(app))))

	// Payment flows
	router.HandlerFunc(http.MethodPost, "/api/v1/ticket/event/:eventid/:ticketid/payment-session", rateLimiter.Limit(authmidware(CreateTicketPaymentSession(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/ticket/event/:eventid/:ticketid/confirm-purchase", rateLimiter.Limit(authmidware(ConfirmTicketPurchase(app))))

	// Verification/printing
	router.HandlerFunc(http.MethodGet, "/api/v1/ticket/verify/:eventid", rateLimiter.Limit(authmidware(VerifyTicket(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/ticket/print/:eventid", rateLimiter.Limit(authmidware(PrintTicket(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/ticket/transfer/:eventid", rateLimiter.Limit(authmidware(TransferTicket(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/ticket/cancel/:eventid", rateLimiter.Limit(authmidware(CancelTicket(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/ticket/mytickets/:eventid", rateLimiter.Limit(authmidware(ListMyTickets(app))))

	// Event updates
	router.HandlerFunc(http.MethodGet, "/api/v1/events/event/:eventid/updates", rateLimiter.Limit(EventUpdates(app)))

	// Seats
	router.HandlerFunc(http.MethodGet, "/api/v1/seats/:eventid/available-seats", rateLimiter.Limit(GetAvailableSeats(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/seats/:eventid/lock-seats", rateLimiter.Limit(authmidware(LockSeats(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/seats/:eventid/unlock-seats", rateLimiter.Limit(authmidware(UnlockSeats(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/seats/:eventid/ticket/:ticketid/confirm-purchase", rateLimiter.Limit(authmidware(ConfirmSeatPurchase(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/ticket/event/:eventid/:ticketid/seats", rateLimiter.Limit(GetTicketSeats(app)))
}
