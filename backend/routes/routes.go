package routes

import (
	"naevis/infra"
	"naevis/internal/auth"
	"naevis/internal/beats/suggestions"
	"naevis/internal/events"
	"naevis/internal/faqs"
	"naevis/internal/home"
	"naevis/internal/itinerary"
	"naevis/internal/maps"
	"naevis/internal/menu"
	"naevis/internal/notices"
	"naevis/internal/places"
	"naevis/internal/products"
	"naevis/internal/profile"
	"naevis/internal/search"
	"naevis/internal/settings"
	"naevis/internal/userdata"
	"naevis/internal/userdata/metadata"
	"naevis/middleware"
	"naevis/utils"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

// func AddStaticRoutes(router *httprouter.Router) {
// 	router.ServeFiles("/static/uploads/*filepath", http.Dir("static/uploads"))
// }

func AddHomeRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	// router.HandlerFunc(http.MethodGet,"/api/v1/home/:apiRoute", middleware.OptionalAuth(home.GetHomeContent)) // Public/optional
	router.HandlerFunc(http.MethodGet, "/api/v1/homecards", middleware.OptionalAuth(home.HomeCardsHandler(app))) // Public/optional
}

func AddProductRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	router.HandlerFunc(http.MethodGet, "/api/v1/products/:entityType/:entityId", middleware.OptionalAuth(products.GetProductDetails(app)))
}

// Routes registration
func AddNoticesRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// CREATE
	router.HandlerFunc(http.MethodPost, "/api/v1/notices/:entitytype/:entityid", rateLimiter.Limit(authmidware(notices.CreateNotice(app))))

	// READ
	router.HandlerFunc(http.MethodGet, "/api/v1/notices/:entitytype/:entityid", notices.GetNotices(app))
	router.HandlerFunc(http.MethodGet, "/api/v1/notices/:entitytype/:entityid/:noticeid", notices.GetNotice(app))

	// UPDATE + DELETE
	router.HandlerFunc(http.MethodPut, "/api/v1/notices/:entitytype/:entityid/:noticeid", rateLimiter.Limit(authmidware(notices.UpdateNotice(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/notices/:entitytype/:entityid/:noticeid", rateLimiter.Limit(authmidware(notices.DeleteNotice(app))))
}

func AddAuthRoutes(router *httprouter.Router, app *infra.Deps, limiter *middleware.RateLimiter) {
	authmid := middleware.Authenticate(app)
	// router.HandlerFunc accepts standard http.HandlerFunc directly!
	router.HandlerFunc(http.MethodPost, "/api/v1/auth/register", limiter.Limit(auth.Register(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/auth/login", limiter.Limit(auth.Login(app)))

	// Refresh should NOT use aggressive limiter
	router.HandlerFunc(http.MethodPost, "/api/v1/auth/refresh", auth.RefreshToken(app))

	// Logout routes
	router.HandlerFunc(http.MethodPost, "/api/v1/auth/logout", auth.LogoutUser(app))
	router.HandlerFunc(http.MethodPost, "/api/v1/auth/logout-all", authmid(auth.LogoutAllSessions(app)))

	// OTP routes
	router.HandlerFunc(http.MethodPost, "/api/v1/auth/verify-otp", limiter.Limit(auth.VerifyOTPHandler(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/auth/request-otp", limiter.Limit(auth.RequestOTPHandler(app)))
}

func AddEventsRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/events/events", rateLimiter.Limit(events.GetEvents(app)))            // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/events/events/count", rateLimiter.Limit(events.GetEventsCount(app))) // Public
	router.HandlerFunc(http.MethodPost, "/api/v1/events/event", authmidware(events.CreateEvent(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/events/event/:eventid", events.GetEvent(app)) // Public
	router.HandlerFunc(http.MethodPut, "/api/v1/events/event/:eventid", authmidware(events.EditEvent(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/events/event/:eventid", authmidware(events.DeleteEvent(app)))

	// Should probably require auth if restricted
	// Add FAQs for an entity
	// Create faq
	router.HandlerFunc(http.MethodPost, "/api/v1/faqs/:entitytype/:entityid", rateLimiter.Limit(authmidware(faqs.CreateFAQ(app))))

	// Get faqs for an entity (supports pagination/sorting via query params)
	router.HandlerFunc(http.MethodGet, "/api/v1/faqs/:entitytype/:entityid", faqs.GetFAQs(app)) // Public

	router.HandlerFunc(http.MethodGet, "/api/v1/faqs/:entitytype/:entityid/:faqid", faqs.GetFAQ(app))

	// Update & Delete
	router.HandlerFunc(http.MethodPut, "/api/v1/faqs/:entitytype/:entityid/:faqid", rateLimiter.Limit(authmidware(faqs.UpdateFAQ(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/faqs/:entitytype/:entityid/:faqid", rateLimiter.Limit(authmidware(faqs.DeleteFAQ(app))))
}

func AddSuggestionsRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/suggestions/places/nearby", rateLimiter.Limit(suggestions.GetNearbyPlaces(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/suggestions/follow", rateLimiter.Limit(authmidware(suggestions.SuggestFollowers(app))))
}

func AddPlaceRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Public
	router.HandlerFunc(http.MethodGet, "/api/v1/places/places", rateLimiter.Limit(places.GetPlaces(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/places/place/:placeid", rateLimiter.Limit(places.GetPlace(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/places/place-details", rateLimiter.Limit(places.GetPlaceQ(app)))

	// Authenticated place management
	router.HandlerFunc(http.MethodPost, "/api/v1/places/place", rateLimiter.Limit(authmidware(places.CreatePlace(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/places/place/:placeid", rateLimiter.Limit(authmidware(places.EditPlace(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/places/place/:placeid", rateLimiter.Limit(authmidware(places.DeletePlace(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/places/place/:placeid/info", rateLimiter.Limit(authmidware(places.UpdatePlaceInfo(app))))

	// Menus (public view + auth for changes)
	router.HandlerFunc(http.MethodGet, "/api/v1/places/menu/:placeid", rateLimiter.Limit(menu.GetMenus(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/places/menu/:placeid/:menuid/stock", rateLimiter.Limit(menu.GetStock(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/places/menu/:placeid/:menuid", rateLimiter.Limit(menu.GetMenu(app)))

	router.HandlerFunc(http.MethodPost, "/api/v1/places/menu/:placeid", rateLimiter.Limit(authmidware(menu.CreateMenu(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/places/menu/:placeid/:menuid", rateLimiter.Limit(authmidware(menu.EditMenu(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/places/menu/:placeid/:menuid", rateLimiter.Limit(authmidware(menu.DeleteMenu(app))))

	// Buying & payment flows
	router.HandlerFunc(http.MethodPost, "/api/v1/places/menu/:placeid/:menuid/buy", rateLimiter.Limit(authmidware(menu.BuyMenu(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/places/menu/:placeid/:menuid/payment-session", rateLimiter.Limit(authmidware(menu.CreateMenuPaymentSession(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/places/menu/:placeid/:menuid/confirm-purchase", rateLimiter.Limit(authmidware(menu.ConfirmMenuPurchase(app))))
}

func AddProfileRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Own profile
	router.HandlerFunc(http.MethodGet, "/api/v1/profile/profile", rateLimiter.Limit(authmidware(profile.GetProfile(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/profile/edit", rateLimiter.Limit(authmidware(profile.EditProfile(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/profile/delete", rateLimiter.Limit(authmidware(profile.DeleteProfile(app))))

	// Public profile viewing
	router.HandlerFunc(http.MethodGet, "/api/v1/user/:username", rateLimiter.Limit(profile.GetUserProfile(app)))

	// Other user data (requires auth to see private info)
	router.HandlerFunc(http.MethodGet, "/api/v1/user/:username/data", rateLimiter.Limit(authmidware(userdata.GetUserProfileData(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/user/:username/udata", rateLimiter.Limit(authmidware(userdata.GetOtherUserProfileData(app))))

}

// AddMapRoutes registers all map endpoints including WebSocket tracking
func AddMapRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	// Unified Map Endpoint with Permalinks & Floor Multi-layers
	router.HandlerFunc(http.MethodGet, "/api/v1/gta/map", rateLimiter.Limit(maps.GetGtaMap))

	// Distance measurement route
	router.HandlerFunc(http.MethodGet, "/api/v1/gta/map/distance", rateLimiter.Limit(maps.CalculateDistance))

	// Real-Time WebSocket Player & Vehicle Tracking
	router.HandlerFunc(http.MethodGet, "/api/v1/gta/map/ws", maps.HandleLiveTrackingWS)

	// Player progression routes
	router.HandlerFunc(http.MethodPost, "/api/v1/player/progress", rateLimiter.Limit(maps.UpdatePlayerProgress))
	router.HandlerFunc(http.MethodGet, "/api/v1/player/progress", rateLimiter.Limit(maps.GetPlayerProgress))
}

func AddItineraryRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Public
	router.HandlerFunc(http.MethodGet, "/api/v1/itineraries", rateLimiter.Limit(itinerary.GetItineraries(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/itineraries/all/:id", rateLimiter.Limit(itinerary.GetItinerary(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/itineraries/search", rateLimiter.Limit(itinerary.SearchItineraries(app)))

	// Authenticated write
	router.HandlerFunc(http.MethodPost, "/api/v1/itineraries", rateLimiter.Limit(authmidware(itinerary.CreateItinerary(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/itineraries/:id", rateLimiter.Limit(authmidware(itinerary.UpdateItinerary(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/itineraries/:id", rateLimiter.Limit(authmidware(itinerary.DeleteItinerary(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/itineraries/:id/fork", rateLimiter.Limit(authmidware(itinerary.ForkItinerary(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/itineraries/:id/publish", rateLimiter.Limit(authmidware(itinerary.PublishItinerary(app))))
}

func AddUtilityRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/csrf", rateLimiter.Limit(authmidware(utils.CSRF)))
}

func AddSettingsRoutes(
	router *httprouter.Router,
	app *infra.Deps,
	rateLimiter *middleware.RateLimiter,
) {
	authmidware := middleware.Authenticate(app)

	router.HandlerFunc(http.MethodGet, "/api/v1/settings", rateLimiter.Limit(authmidware(settings.GetSettings(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/settings/schema", rateLimiter.Limit(authmidware(settings.GetSettingsSchema(app))))
	router.HandlerFunc(http.MethodPatch, "/api/v1/settings", rateLimiter.Limit(authmidware(settings.UpdateSettings(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/settings/reset", rateLimiter.Limit(authmidware(settings.ResetSettings(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/settings/init", rateLimiter.Limit(authmidware(settings.InitUserSettings(app))))

	// router.HandlerFunc(http.MethodGet,
	// 	"/api/v1/settings/init/:userid",
	// 	rateLimiter.Limit(authmidware(settings.InitUserSettings(app))),
	// )

	// router.HandlerFunc(http.MethodGet,
	// 	"/api/v1/settings/all",
	// 	rateLimiter.Limit(authmidware(settings.GetUserSettings(app))),
	// )

	// router.HandlerFunc(http.MethodPut,
	// 	"/api/v1/settings/setting/:type",
	// 	rateLimiter.Limit(authmidware(settings.UpdateUserSetting(app))),
	// )
}

func AddMiscRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	router.HandlerFunc(http.MethodGet, "/api/v1/users/meta", rateLimiter.Limit(metadata.GetUsersMeta(app)))

	// router.HandlerFunc(http.MethodPost,"/api/v1/check-file", rateLimiter.Limit(filecheck.CheckFileExists))
	// router.HandlerFunc(http.MethodPost,"/api/v1/upload", rateLimiter.Limit(filecheck.UploadFile))
	// router.HandlerFunc(http.MethodPost,"/api/v1/feed/remhash", rateLimiter.Limit(filecheck.RemoveUserFile))
	// router.HandlerFunc(http.MethodGet,"/resize/:folder/*filename", cdn.ServeStatic)

}

// ----------------------- ROUTES -----------------------

// Search Routes - Public endpoints for search functionality
func AddSearchRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	// Autocomplete suggestions - public, rate-limited
	router.HandlerFunc(http.MethodGet, "/api/v1/ac", rateLimiter.Limit(search.SearchAutocomplete(app)))

	// Search by entity type - public, rate-limited
	router.HandlerFunc(http.MethodGet, "/api/v1/search/:tabId", rateLimiter.Limit(search.SearchByType(app)))
}
