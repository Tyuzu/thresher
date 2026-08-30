package reports

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the reports package.

func AddReportingRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	// Pre-build common middleware chains
	authMid := middleware.Authenticate(app)
	modOnly := middleware.Chain(authMid, middleware.RequireRoles("moderator"))
	adminOnly := middleware.Chain(authMid, middleware.RequireRoles("admin"))

	// ------------------------------------------------------------
	// USER / PUBLIC REPORTING & APPEALS
	// ------------------------------------------------------------

	// Submit a report
	router.HandlerFunc(
		http.MethodPost,
		"/api/v1/report",
		middleware.Chain(rateLimiter.Limit, authMid)(ReportContent(app)),
	)

	// Create an appeal
	router.HandlerFunc(
		http.MethodPost,
		"/api/v1/appeals",
		middleware.Chain(rateLimiter.Limit, authMid)(CreateAppeal(app)),
	)

	// Apply to become a moderator
	router.HandlerFunc(
		http.MethodPost,
		"/api/v1/moderator/apply",
		middleware.Chain(rateLimiter.Limit, authMid)(ApplyModerator(app)),
	)

	// ------------------------------------------------------------
	// MODERATOR / ADMIN ENDPOINTS
	// ------------------------------------------------------------

	// Update report status
	router.HandlerFunc(
		http.MethodPut,
		"/api/v1/report/:id",
		modOnly(UpdateReport(app)),
	)

	// Fetch reports for moderation
	router.HandlerFunc(
		http.MethodGet,
		"/api/v1/moderator/reports",
		modOnly(GetReportsForMod(app)),
	)

	// Soft-delete content
	router.HandlerFunc(
		http.MethodPut,
		"/api/v1/moderator/delete/:type/:id",
		modOnly(SoftDeleteEntity(app)),
	)

	// Manage appeals (list + update)
	router.HandlerFunc(
		http.MethodGet,
		"/api/v1/moderator/appeals",
		modOnly(GetAppeals(app)),
	)

	router.HandlerFunc(
		http.MethodPut,
		"/api/v1/moderator/appeals/:id",
		modOnly(UpdateAppeal(app)),
	)

	// Moderator application review (Secured with Admin role)
	router.HandlerFunc(
		http.MethodGet,
		"/api/v1/moderator/applications",
		adminOnly(ListModeratorApplications(app)),
	)

	router.HandlerFunc(
		http.MethodPut,
		"/api/v1/moderator/approve/:id",
		adminOnly(ApproveModerator(app)),
	)

	router.HandlerFunc(
		http.MethodPut,
		"/api/v1/moderator/reject/:id",
		adminOnly(RejectModerator(app)),
	)
}
