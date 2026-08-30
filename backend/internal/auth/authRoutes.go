package auth

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the auth package.

func AddAuthRoutes(router *httprouter.Router, app *infra.Deps, limiter *middleware.RateLimiter) {
	authmid := middleware.Authenticate(app)
	// router.HandlerFunc accepts standard http.HandlerFunc directly!
	router.HandlerFunc(http.MethodPost, "/api/v1/auth/register", limiter.Limit(Register(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/auth/login", limiter.Limit(Login(app)))

	// Refresh should NOT use aggressive limiter
	router.HandlerFunc(http.MethodPost, "/api/v1/auth/refresh", RefreshToken(app))

	// Logout routes
	router.HandlerFunc(http.MethodPost, "/api/v1/auth/logout", LogoutUser(app))
	router.HandlerFunc(http.MethodPost, "/api/v1/auth/logout-all", authmid(LogoutAllSessions(app)))

	// OTP routes
	router.HandlerFunc(http.MethodPost, "/api/v1/auth/verify-otp", limiter.Limit(VerifyOTPHandler(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/auth/request-otp", limiter.Limit(RequestOTPHandler(app)))
}
