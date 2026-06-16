package routes

import (
	"naevis/infra"
	"naevis/middleware"
	"naevis/reports"

	"github.com/julienschmidt/httprouter"
)

func AddReportingRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.PUT("/api/v1/report/:id",
		authmidware(
			middleware.RequireRoles("moderator")(
				reports.UpdateReport(app),
			),
		),
	)

	router.POST("/api/v1/report",
		rateLimiter.Limit(
			authmidware(reports.ReportContent(app)),
		),
	)

	// Public (authenticated) endpoint to create appeals
	router.POST("/api/v1/appeals",
		rateLimiter.Limit(
			authmidware(reports.CreateAppeal(app)),
		),
	)

	// router.POST("/api/v1/moderator/apply", moderator.ApplyModerator)
	router.GET("/api/v1/moderator/applications", reports.ListModeratorApplications(app))
	router.PUT("/api/v1/moderator/approve/:id", reports.ApproveModerator(app))
	router.PUT("/api/v1/moderator/reject/:id", reports.RejectModerator(app))

	// Moderator-only endpoints
	router.GET("/api/v1/moderator/reports",
		authmidware(
			middleware.RequireRoles("moderator")(
				reports.GetReportsForMod(app),
			),
		),
	)

	router.POST("/api/v1/moderator/apply",
		rateLimiter.Limit(
			authmidware(reports.ApplyModerator(app)),
		),
	)

	// Moderator-only: soft-delete entities
	router.PUT("/api/v1/moderator/delete/:type/:id",
		authmidware(
			middleware.RequireRoles("moderator")(
				reports.SoftDeleteEntity(app),
			),
		),
	)

	// Moderator-only: appeals management (list + update)
	router.GET("/api/v1/moderator/appeals",
		authmidware(
			middleware.RequireRoles("moderator")(
				reports.GetAppeals(app),
			),
		),
	)
	router.PUT("/api/v1/moderator/appeals/:id",
		authmidware(
			middleware.RequireRoles("moderator")(
				reports.UpdateAppeal(app),
			),
		),
	)

}
