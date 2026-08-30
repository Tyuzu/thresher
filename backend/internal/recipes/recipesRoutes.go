package recipes

import (
	"net/http"
	"scav/infra"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the recipes package.

func AddRecipeRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/recipes/tags", rateLimiter.Limit(GetRecipeTags(app)))         // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/recipes", middleware.OptionalAuth(GetRecipes(app)))           // Public/optional
	router.HandlerFunc(http.MethodGet, "/api/v1/recipes/recipe/:id", middleware.OptionalAuth(GetRecipe(app))) // Public/optional

	// Modifications require auth
	router.HandlerFunc(http.MethodPost, "/api/v1/recipes", authmidware(CreateRecipe(app)))
	router.HandlerFunc(http.MethodPut, "/api/v1/recipes/recipe/:id", authmidware(UpdateRecipe(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/recipes/recipe/:id", authmidware(DeleteRecipe(app)))
}
