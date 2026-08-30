package places

import (
	"net/http"
	"scav/infra"
	tabs "scav/internal/places/tabs"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

// RegisterRoutes sets up HTTP routes for the places package.

// 🍽️ Restaurant / Café → Menu
func DisplayPlaceMenu(router *httprouter.Router, app *infra.Deps) {
	router.GET("/api/v1/place/:placeid/menu", tabs.GetMenuTab)
	router.POST("/api/v1/place/:placeid/menu", tabs.PostMenuTab)
	router.PUT("/api/v1/place/:placeid/menu/:itemId", tabs.PutMenuTab)
	router.DELETE("/api/v1/place/:placeid/menu/:itemId", tabs.DeleteMenuTab)
	router.POST("/api/v1/place/:placeid/menu/:itemId/order", tabs.PostMenuOrder)
}

// 🏨 Hotel → Rooms
func DisplayPlaceRooms(router *httprouter.Router, app *infra.Deps) {
	router.GET("/api/v1/place/:placeid/rooms", tabs.GetRooms)
	router.GET("/api/v1/place/:placeid/rooms/:roomId", tabs.GetRoom)
	router.POST("/api/v1/place/:placeid/rooms", tabs.PostRoom)
	router.PUT("/api/v1/place/:placeid/rooms/:roomId", tabs.PutRoom)
	router.DELETE("/api/v1/place/:placeid/rooms/:roomId", tabs.DeleteRoom)
}

// 🌳 Park → Facilities
func DisplayPlaceFacilities(router *httprouter.Router, app *infra.Deps) {
	router.GET("/api/v1/place/:placeid/facilities", tabs.GetFacilities)
	router.POST("/api/v1/place/:placeid/facilities", tabs.PostFacility)
	router.PUT("/api/v1/place/:placeid/facilities/:facilityId", tabs.PutFacility)
	router.GET("/api/v1/place/:placeid/facilities/:facilityId", tabs.GetFacility)
	router.DELETE("/api/v1/place/:placeid/facilities/:facilityId", tabs.DeleteFacility)
}

// 🏢 Business → Services
func DisplayPlaceServices(router *httprouter.Router, app *infra.Deps) {
	router.GET("/api/v1/place/:placeid/services", tabs.GetServices)
	router.POST("/api/v1/place/:placeid/services", tabs.PostService)
	router.PUT("/api/v1/place/:placeid/services/:serviceId", tabs.PutService)
	router.GET("/api/v1/place/:placeid/services/:serviceId", tabs.GetService)
	router.DELETE("/api/v1/place/:placeid/services/:serviceId", tabs.DeleteService)
}

// 🛍️ Shop → Products
func DisplayPlaceProducts(router *httprouter.Router, app *infra.Deps) {
	router.GET("/api/v1/place/:placeid/products", tabs.GetProducts(app))
	router.POST("/api/v1/place/:placeid/products", tabs.PostProduct(app))
	router.PUT("/api/v1/place/:placeid/products/:productId", tabs.PutProduct(app))
	router.GET("/api/v1/place/:placeid/products/:productId", tabs.GetProduct(app))
	router.DELETE("/api/v1/place/:placeid/products/:productId", tabs.DeleteProduct(app))
	router.POST("/api/v1/place/:placeid/products/:productId/buy", tabs.PostProductPurchase(app))
}

// 🖼️ Museum → Exhibits
func DisplayPlaceExhibits(router *httprouter.Router, app *infra.Deps) {
	router.GET("/api/v1/place/:placeid/exhibits", tabs.GetExhibits)
	router.POST("/api/v1/place/:placeid/exhibits", tabs.PostExhibit)
	router.PUT("/api/v1/place/:placeid/exhibits/:exhibitId", tabs.PutExhibit)
	router.GET("/api/v1/place/:placeid/exhibits/:exhibitId", tabs.GetExhibit)
	router.DELETE("/api/v1/place/:placeid/exhibits/:exhibitId", tabs.DeleteExhibit)
}

// 🏋️ Gym → Membership
func DisplayPlaceMembership(router *httprouter.Router, app *infra.Deps) {
	router.GET("/api/v1/place/:placeid/membership", tabs.GetMemberships)
	router.POST("/api/v1/place/:placeid/membership", tabs.PostMembership)
	router.PUT("/api/v1/place/:placeid/membership/:membershipId", tabs.PutMembership)
	router.GET("/api/v1/place/:placeid/membership/:membershipId", tabs.GetMembership)
	router.DELETE("/api/v1/place/:placeid/membership/:membershipId", tabs.DeleteMembership)
	router.POST("/api/v1/place/:placeid/membership/:membershipId/join", tabs.PostJoinMembership)
}

// 🎭 Theater → Shows
func DisplayPlaceShows(router *httprouter.Router, app *infra.Deps) {
	router.GET("/api/v1/place/:placeid/shows", tabs.GetShows)
	router.POST("/api/v1/place/:placeid/shows", tabs.PostShow)
	router.PUT("/api/v1/place/:placeid/shows/:showId", tabs.PutShow)
	router.GET("/api/v1/place/:placeid/shows/:showId", tabs.GetShow)
	router.DELETE("/api/v1/place/:placeid/shows/:showId", tabs.DeleteShow)
	router.POST("/api/v1/place/:placeid/shows/:showId/book", tabs.PostBookShow)
}

// 🏟️ Arena → Events
func DisplayPlaceEvents(router *httprouter.Router, app *infra.Deps) {
	router.GET("/api/v1/place/:placeid/events", tabs.GetEvents(app))
	router.POST("/api/v1/place/:placeid/events", tabs.PostEvent(app))
	router.PUT("/api/v1/place/:placeid/events/:eventId", tabs.PutEvent(app))
	router.GET("/api/v1/place/:placeid/events/:eventId", tabs.GetEvent(app))
	router.DELETE("/api/v1/place/:placeid/events/:eventId", tabs.DeleteEvent(app))
	router.POST("/api/v1/place/:placeid/events/:eventId/view", tabs.PostViewEventDetails(app))
}

// 💈 Saloon → Slots (if applicable)
func DisplaySaloonSlots(router *httprouter.Router, app *infra.Deps) {
	router.GET("/api/v1/place/:placeid/saloon/slots", tabs.GetSaloonSlots)
	router.POST("/api/v1/place/:placeid/saloon/slots", tabs.PostSaloonSlot)
	router.PUT("/api/v1/place/:placeid/saloon/slots/:slotId", tabs.PutSaloonSlot)
	router.DELETE("/api/v1/place/:placeid/saloon/slots/:slotId", tabs.DeleteSaloonSlot)
	router.POST("/api/v1/place/:placeid/saloon/slots/:slotId/book", tabs.BookSaloonSlot)
}

// ❓ Fallback → Generic Place Info
func DisplayPlaceDetailsFallback(router *httprouter.Router, app *infra.Deps) {
	router.GET("/api/v1/place/:placeid/details", tabs.GetDetailsFallback)
}

func AddPlaceTabRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	DisplayPlaceMenu(router, app)
	DisplayPlaceRooms(router, app)
	DisplayPlaceFacilities(router, app)
	DisplayPlaceServices(router, app)
	DisplayPlaceProducts(router, app)
	DisplayPlaceExhibits(router, app)
	DisplayPlaceMembership(router, app)
	DisplayPlaceShows(router, app)
	DisplayPlaceEvents(router, app)
	DisplaySaloonSlots(router, app)
	DisplayPlaceDetailsFallback(router, app)
}

func AddPlaceRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Public
	router.HandlerFunc(http.MethodGet, "/api/v1/places/places", rateLimiter.Limit(GetPlaces(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/places/place/:placeid", rateLimiter.Limit(GetPlace(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/places/place-details", rateLimiter.Limit(GetPlaceQ(app)))

	// Authenticated place management
	router.HandlerFunc(http.MethodPost, "/api/v1/places/place", rateLimiter.Limit(authmidware(CreatePlace(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/places/place/:placeid", rateLimiter.Limit(authmidware(EditPlace(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/places/place/:placeid", rateLimiter.Limit(authmidware(DeletePlace(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/places/place/:placeid/info", rateLimiter.Limit(authmidware(UpdatePlaceInfo(app))))
}
