// routes/pay.go
package routes

import (
	"naevis/infra"
	"naevis/middleware"
	"naevis/pay"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

func AddPayRoutes(r *httprouter.Router, app *infra.Deps, rl *middleware.RateLimiter) {
	auth := middleware.Authenticate(app)

	paySvc := pay.NewPaymentService(app)
	paySvc.RegisterDefaultResolvers()

	r.HandlerFunc(http.MethodPost, "/api/v1/wallet/create", middleware.Chain(rl.Limit, auth)(paySvc.CreateWallet)) //

	r.HandlerFunc(http.MethodGet, "/api/v1/wallet/balance", middleware.Chain(rl.Limit, auth)(paySvc.GetBalance))
	r.HandlerFunc(http.MethodPost, "/api/v1/wallet/topup", middleware.Chain(rl.Limit, auth, middleware.WithTxn)(paySvc.TopUp))
	r.HandlerFunc(http.MethodPost, "/api/v1/wallet/pay", middleware.Chain(rl.Limit, auth, middleware.WithTxn)(paySvc.Pay))
	r.HandlerFunc(http.MethodPost, "/api/v1/wallet/transfer", middleware.Chain(rl.Limit, auth, middleware.WithTxn)(paySvc.Transfer))
	r.HandlerFunc(http.MethodPost, "/api/v1/wallet/refund", middleware.Chain(rl.Limit, auth, middleware.WithTxn)(paySvc.Refund))
	r.HandlerFunc(http.MethodGet, "/api/v1/wallet/transactions", middleware.Chain(rl.Limit, auth)(paySvc.ListTransactions))

	// Cash-on-delivery payment endpoint
	r.HandlerFunc(http.MethodPost, "/api/v1/payments/cash-on-delivery", middleware.Chain(rl.Limit, auth, middleware.WithTxn)(paySvc.CashOnDelivery))

	// Refund request endpoints
	r.HandlerFunc(http.MethodPost, "/api/v1/refunds/request", middleware.Chain(rl.Limit, auth)(pay.CreateRefundRequest(app)))
	r.HandlerFunc(http.MethodGet, "/api/v1/refunds/my-requests", middleware.Chain(rl.Limit, auth)(pay.GetMyRefundRequests(app)))
	r.HandlerFunc(http.MethodGet, "/api/v1/refunds/all", middleware.Chain(rl.Limit, auth)(pay.GetAllRefundRequests(app)))
	r.HandlerFunc(http.MethodPost, "/api/v1/refunds/approve/:id", middleware.Chain(rl.Limit, auth, middleware.WithTxn)(pay.ApproveRefundRequest(app)))
	r.HandlerFunc(http.MethodPost, "/api/v1/refunds/reject/:id", middleware.Chain(rl.Limit, auth)(pay.RejectRefundRequest(app)))
}
