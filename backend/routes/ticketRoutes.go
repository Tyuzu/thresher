package routes

import (
	"naevis/infra"
	"naevis/internal/tickets"
	"naevis/middleware"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

func AddTicketRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Ticket CRUD
	router.HandlerFunc(http.MethodPost, "/api/v1/ticket/event/:eventid", rateLimiter.Limit(authmidware(tickets.CreateTicket(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/ticket/event/:eventid", rateLimiter.Limit(tickets.GetTickets(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/ticket/event/:eventid/:ticketid", rateLimiter.Limit(tickets.GetTicket(app)))
	router.HandlerFunc(http.MethodPut, "/api/v1/ticket/event/:eventid/:ticketid", rateLimiter.Limit(authmidware(tickets.EditTicket(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/ticket/event/:eventid/:ticketid", rateLimiter.Limit(authmidware(tickets.DeleteTicket(app))))

	// Buying
	router.HandlerFunc(http.MethodPost, "/api/v1/ticket/event/:eventid/:ticketid/buy", rateLimiter.Limit(authmidware(tickets.BuyTicket(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/tickets/book", rateLimiter.Limit(authmidware(tickets.BuysTicket(app))))

	// Payment flows
	router.HandlerFunc(http.MethodPost, "/api/v1/ticket/event/:eventid/:ticketid/payment-session", rateLimiter.Limit(authmidware(tickets.CreateTicketPaymentSession(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/ticket/event/:eventid/:ticketid/confirm-purchase", rateLimiter.Limit(authmidware(tickets.ConfirmTicketPurchase(app))))

	// Verification/printing
	router.HandlerFunc(http.MethodGet, "/api/v1/ticket/verify/:eventid", rateLimiter.Limit(authmidware(tickets.VerifyTicket(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/ticket/print/:eventid", rateLimiter.Limit(authmidware(tickets.PrintTicket(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/ticket/transfer/:eventid", rateLimiter.Limit(authmidware(tickets.TransferTicket(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/ticket/cancel/:eventid", rateLimiter.Limit(authmidware(tickets.CancelTicket(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/ticket/mytickets/:eventid", rateLimiter.Limit(authmidware(tickets.ListMyTickets(app))))

	// Event updates
	router.HandlerFunc(http.MethodGet, "/api/v1/events/event/:eventid/updates", rateLimiter.Limit(tickets.EventUpdates(app)))

	// Seats
	router.HandlerFunc(http.MethodGet, "/api/v1/seats/:eventid/available-seats", rateLimiter.Limit(tickets.GetAvailableSeats(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/seats/:eventid/lock-seats", rateLimiter.Limit(authmidware(tickets.LockSeats(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/seats/:eventid/unlock-seats", rateLimiter.Limit(authmidware(tickets.UnlockSeats(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/seats/:eventid/ticket/:ticketid/confirm-purchase", rateLimiter.Limit(authmidware(tickets.ConfirmSeatPurchase(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/ticket/event/:eventid/:ticketid/seats", rateLimiter.Limit(tickets.GetTicketSeats(app)))
}
