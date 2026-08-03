package routes

import (
	"naevis/auth"
	"naevis/autocomplete"
	"naevis/baito"
	"naevis/booking"
	"naevis/events"
	"naevis/hashtags"
	"naevis/home"
	"naevis/infra"
	"naevis/itinerary"
	"naevis/jobs"
	"naevis/maps"
	"naevis/media"
	"naevis/menu"
	"naevis/merch"
	"naevis/metrics/activity"
	"naevis/metrics/ads"
	"naevis/metrics/analytics"
	"naevis/middleware"
	"naevis/places"
	"naevis/posts"
	"naevis/products"
	"naevis/profile"
	"naevis/search"
	"naevis/settings"
	"naevis/suggestions"
	"naevis/tickets"
	"naevis/userdata"
	"naevis/userdata/metadata"
	"naevis/utils"
	"naevis/vendors"
	"net/http"

	"github.com/julienschmidt/httprouter"
)

// func AddStaticRoutes(router *httprouter.Router) {
// 	router.ServeFiles("/static/uploads/*filepath", http.Dir("static/uploads"))
// }

func AddActivityRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	// If activity log/feed is user-specific, keep auth
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodPost, "/api/v1/activity/log", rateLimiter.Limit(authmidware(activity.LogActivities(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/activity/get", authmidware(activity.GetActivityFeed(app)))

	// Public analytics/telemetry ingestion
	router.HandlerFunc(http.MethodPost, "/api/v1/scitylana/event", activity.HandleAnalyticsEvent(app))
}

func AddJobRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/jobs/:entitytype/:entityid", rateLimiter.Limit(jobs.GetJobsRelatedTOEntity(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/jobs/:entitytype/:entityid", rateLimiter.Limit(authmidware(jobs.CreateBaitoForEntity(app))))
}

func AddBaitoRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Create / update jobs → require auth
	router.HandlerFunc(http.MethodPost, "/api/v1/baitos/baito", rateLimiter.Limit(authmidware(baito.CreateBaito(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/baitos/baito/:baitoid", rateLimiter.Limit(authmidware(baito.UpdateBaito(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/baitos/baito/:baitoid", rateLimiter.Limit(authmidware(baito.DeleteBaito(app))))

	// Public job browsing
	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/latest", rateLimiter.Limit(baito.GetLatestBaitos(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/related", rateLimiter.Limit(baito.GetRelatedBaitos(app)))

	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/baito/:baitoid", rateLimiter.Limit(baito.GetBaitoByID(app)))

	// Owner-specific views → require auth
	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/mine", authmidware(baito.GetMyBaitos(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/baito/:baitoid/applicants", authmidware(baito.GetBaitoApplicants(app)))

	// Part-timer actions → require auth
	router.HandlerFunc(http.MethodPost, "/api/v1/baitos/baito/:baitoid/apply", authmidware(baito.ApplyToBaito(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/applications", authmidware(baito.GetMyApplications(app)))

	// Profile creation → require auth
	router.HandlerFunc(http.MethodPost, "/api/v1/baitos/profile", authmidware(baito.CreateWorkerProfile(app)))
	router.HandlerFunc(http.MethodPatch, "/api/v1/baitos/profile/:workerId", authmidware(baito.UpdateWorkerProfile(app)))

	// Worker directory (probably private) → require auth
	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/workers", rateLimiter.Limit(baito.GetWorkers(app)))

	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/workers/skills", rateLimiter.Limit(baito.GetWorkerSkills(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/worker/:workerId", rateLimiter.Limit(baito.GetWorkerById(app)))
}

func AddHomeRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	// router.HandlerFunc(http.MethodGet,"/api/v1/home/:apiRoute", middleware.OptionalAuth(home.GetHomeContent)) // Public/optional
	router.HandlerFunc(http.MethodGet, "/api/v1/homecards", middleware.OptionalAuth(home.HomeCardsHandler(app))) // Public/optional
}

func AddProductRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	router.HandlerFunc(http.MethodGet, "/api/v1/products/:entityType/:entityId", middleware.OptionalAuth(products.GetProductDetails(app)))
}

// // Notifications routes
// func AddNotificationsRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
// 	authmidware := middleware.Authenticate(app)

// 	// Create notification
// 	router.HandlerFunc(http.MethodPost,"/api/v1/notifs", rateLimiter.Limit(authmidware(notifications.CreateNotification(app))))

// 	// Bulk create notifications
// 	router.HandlerFunc(http.MethodPost,"/api/v1/notifs/bulk", rateLimiter.Limit(authmidware(notifications.BulkCreateNotifications(app))))

// 	// Get user notifications
// 	router.HandlerFunc(http.MethodGet,"/api/v1/notifs/user/:userid", notifications.GetUserNotifications(app))

// 	// Get unread count
// 	router.HandlerFunc(http.MethodGet,"/api/v1/notifs/user/:userid/unread", notifications.GetUnreadCount(app))

// 	// Mark notification as read
// 	router.HandlerFunc(http.MethodPut,"/api/v1/notifs/notif/:notificationid/read", rateLimiter.Limit(authmidware(notifications.MarkAsRead(app))))

// 	// Mark all as read
// 	router.HandlerFunc(http.MethodPut,"/api/v1/notifs/user/:userid/read-all", rateLimiter.Limit(authmidware(notifications.MarkAllAsRead(app))))

// 	// Delete notification
// 	router.HandlerFunc(http.MethodDelete,"/api/v1/notifs/notif/:notificationid", rateLimiter.Limit(authmidware(notifications.DeleteNotification(app))))

// 	// Clear all notifications
// 	router.HandlerFunc(http.MethodDelete,"/api/v1/notifs/user/:userid", rateLimiter.Limit(authmidware(notifications.ClearAllNotifications(app))))

// 	// Notification preferences
// 	router.HandlerFunc(http.MethodGet,"/api/v1/notifs/user/:userid/preferences", authmidware(notifications.GetPreferences(app)))
// 	router.HandlerFunc(http.MethodPut,"/api/v1/notifs/user/:userid/preferences", rateLimiter.Limit(authmidware(notifications.UpdatePreferences(app))))
// }

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

// func AddAuthRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
// 	// Public routes
// 	router.HandlerFunc(http.MethodPost,"/api/v1/auth/register", rateLimiter.Limit(auth.Register))
// 	router.HandlerFunc(http.MethodPost,"/api/v1/auth/login", rateLimiter.Limit(auth.Login))
// 	router.HandlerFunc(http.MethodPost,"/api/v1/auth/refresh", rateLimiter.Limit(auth.RefreshToken))
// 	router.HandlerFunc(http.MethodPost,"/api/v1/auth/verify-otp", rateLimiter.Limit(auth.VerifyOTPHandler))
// 	router.HandlerFunc(http.MethodPost,"/api/v1/auth/request-otp", rateLimiter.Limit(auth.RequestOTPHandler))

// 	// Protected routes
// 	router.HandlerFunc(http.MethodPost,"/api/v1/auth/logout", authmidware(auth.LogoutUser))
// }

func AddBookingRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// existing routes
	router.HandlerFunc(http.MethodGet, "/api/v1/bookings/slots", rateLimiter.Limit(authmidware(booking.ListSlots(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/bookings/slots", rateLimiter.Limit(authmidware(booking.CreateSlot(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/bookings/slots/:id", rateLimiter.Limit(authmidware(booking.DeleteSlot(app))))

	router.HandlerFunc(http.MethodGet, "/api/v1/bookings/bookings", rateLimiter.Limit(authmidware(booking.ListBookings(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/bookings/bookings", rateLimiter.Limit(authmidware(booking.CreateBooking(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/bookings/bookings/:id/status", rateLimiter.Limit(authmidware(booking.UpdateBookingStatus(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/bookings/bookings/:id", rateLimiter.Limit(authmidware(booking.CancelBooking(app))))

	router.HandlerFunc(http.MethodGet, "/api/v1/bookings/date-capacity", rateLimiter.Limit(authmidware(booking.GetDateCapacity(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/bookings/date-capacity", rateLimiter.Limit(authmidware(booking.SetDateCapacity(app))))

	// NEW: pricing tiers
	router.HandlerFunc(http.MethodGet, "/api/v1/bookings/tiers", rateLimiter.Limit(authmidware(booking.ListTiers(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/bookings/tiers", rateLimiter.Limit(authmidware(booking.CreateTier(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/bookings/tiers/:id", rateLimiter.Limit(authmidware(booking.DeleteTier(app))))

	// NEW: auto slot generation from tier
	router.HandlerFunc(http.MethodPost, "/api/v1/bookings/tiers/:id/generate-slots", rateLimiter.Limit(authmidware(booking.GenerateSlotsFromTier(app))))
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
	router.HandlerFunc(http.MethodPost, "/api/v1/events/event/:eventid/faqs", authmidware(events.AddFAQs(app)))
}

func AddMerchRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Create merch
	router.HandlerFunc(http.MethodPost, "/api/v1/merch/:entityType/:eventid", rateLimiter.Limit(authmidware(merch.CreateMerch(app))))

	// Buy merch
	router.HandlerFunc(http.MethodPost, "/api/v1/merch/:entityType/:eventid/:merchid/buy", rateLimiter.Limit(authmidware(merch.BuyMerch(app))))

	// Public view
	router.HandlerFunc(http.MethodGet, "/api/v1/merch/:entityType/:eventid", merch.GetMerchs(app))
	router.HandlerFunc(http.MethodGet, "/api/v1/merch/:entityType/:eventid/:merchid", merch.GetMerch(app))
	router.HandlerFunc(http.MethodGet, "/api/v1/merch/:entityType", merch.GetMerchPage(app))

	// Edit/Delete
	router.HandlerFunc(http.MethodPut, "/api/v1/merch/:entityType/:eventid/:merchid", rateLimiter.Limit(authmidware(merch.EditMerch(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/merch/:entityType/:eventid/:merchid", rateLimiter.Limit(authmidware(merch.DeleteMerch(app))))

	// Payment flows
	router.HandlerFunc(http.MethodPost, "/api/v1/merch/:entityType/:eventid/:merchid/payment-session", rateLimiter.Limit(authmidware(merch.CreateMerchPaymentSession(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/merch/:entityType/:eventid/:merchid/confirm-purchase", rateLimiter.Limit(authmidware(merch.ConfirmMerchPurchase(app))))
}

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

func AddSuggestionsRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/suggestions/places/nearby", rateLimiter.Limit(suggestions.GetNearbyPlaces(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/suggestions/follow", rateLimiter.Limit(authmidware(suggestions.SuggestFollowers(app))))
}

func AddAutocompleteRoutes(
	router *httprouter.Router,
	app *infra.Deps,
	rateLimiter *middleware.RateLimiter,
) {
	router.HandlerFunc(http.MethodGet,
		"/api/v1/ac/places",
		rateLimiter.Limit(autocomplete.AutocompletePlaces(app)),
	)

	router.HandlerFunc(http.MethodGet,
		"/api/v1/ac/users",
		rateLimiter.Limit(autocomplete.AutocompleteUsers(app)),
	)
}

func AddMediaRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Public view, but rate-limited
	router.HandlerFunc(http.MethodGet, "/api/v1/media/:entitytype/:entityid/:id", rateLimiter.Limit(media.GetMedia(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/media/:entitytype/:entityid", rateLimiter.Limit(media.GetMedias(app)))

	// Authenticated actions
	router.HandlerFunc(http.MethodPost, "/api/v1/media/:entitytype/:entityid", rateLimiter.Limit(authmidware(media.AddMedia(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/media/:entitytype/:entityid/:id", rateLimiter.Limit(authmidware(media.EditMedia(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/media/:entitytype/:entityid/:id", rateLimiter.Limit(authmidware(media.DeleteMedia(app))))
}

func AddPostRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Public read
	router.HandlerFunc(http.MethodGet, "/api/v1/posts/post/:id", rateLimiter.Limit(posts.GetPost(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/posts", rateLimiter.Limit(posts.GetAllPosts(app)))
	// router.HandlerFunc(http.MethodPost,"/api/v1/posts/upload", rateLimiter.Limit(posts.UploadImage))

	// Authenticated write
	router.HandlerFunc(http.MethodPost, "/api/v1/posts/post", rateLimiter.Limit(authmidware(posts.CreatePost(app))))
	router.HandlerFunc(http.MethodPatch, "/api/v1/posts/post/:id", rateLimiter.Limit(authmidware(posts.UpdatePost(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/posts/post/:id", rateLimiter.Limit(authmidware(posts.DeletePost(app))))

	router.HandlerFunc(http.MethodGet, "/api/v1/posts/post/:id/related", rateLimiter.Limit(authmidware(posts.GetRelatedPosts(app))))

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

//	func AddSettingsRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
//		router.HandlerFunc(http.MethodGet,"/api/v1/settings/init/:userid", rateLimiter.Limit(authmidware(settings.InitUserSettings(app))))
//		router.HandlerFunc(http.MethodGet,"/api/v1/settings/all", rateLimiter.Limit(authmidware(settings.GetUserSettings(app))))
//		router.HandlerFunc(http.MethodPut,"/api/v1/settings/setting/:type", rateLimiter.Limit(authmidware(settings.UpdateUserSetting(app))))
//	}
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

func AddAdsRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	router.HandlerFunc(http.MethodGet, "/api/v1/sda/sda", rateLimiter.Limit(middleware.OptionalAuth(ads.GetAds)))
}

func AddHashtagRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	router.HandlerFunc(http.MethodGet, "/api/v1/hashtags/hashtag/:tag", hashtags.GetHashtagPosts)
	router.HandlerFunc(http.MethodGet, "/api/v1/hashtags/hashtag/:tag/top", hashtags.GetTopHashtagPosts)
	router.HandlerFunc(http.MethodGet, "/api/v1/hashtags/hashtag/:tag/latest", hashtags.GetLatestHashtagPosts)
	router.HandlerFunc(http.MethodGet, "/api/v1/hashtags/hashtag/:tag/people", hashtags.GetHashtagPeople)
	router.HandlerFunc(http.MethodGet, "/api/v1/hashtags/hashtags/trending", hashtags.GetTrendingHashtags)

	// router.HandlerFunc(http.MethodGet,"/api/v1/hashtags/hashtag/:tag", hashtags.GetHashtagPosts)
	// router.HandlerFunc(http.MethodGet,"/api/v1/hashtags/hashtags/trending", hashtags.GetTrendingHashtags)
}

func AddAnalyticsRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	// Example: /api/v1/antics/events/123 or /api/v1/analytics/places/456
	router.HandlerFunc(http.MethodGet, "/api/v1/antics/:entityType/:entityId", rateLimiter.Limit(analytics.GetEntityAnalytics))
}

func AddMiscRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	router.HandlerFunc(http.MethodGet, "/api/v1/users/meta", rateLimiter.Limit(metadata.GetUsersMeta(app)))

	// router.HandlerFunc(http.MethodPost,"/api/v1/check-file", rateLimiter.Limit(filecheck.CheckFileExists))
	// router.HandlerFunc(http.MethodPost,"/api/v1/upload", rateLimiter.Limit(filecheck.UploadFile))
	// router.HandlerFunc(http.MethodPost,"/api/v1/feed/remhash", rateLimiter.Limit(filecheck.RemoveUserFile))
	// router.HandlerFunc(http.MethodGet,"/resize/:folder/*filename", cdn.ServeStatic)

}

// ----------------------- ROUTES -----------------------

// Vendor Routes
func AddVendorRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authMiddleware := middleware.Authenticate(app)

	// Vendor management
	router.HandlerFunc(http.MethodPost, "/api/v1/vendors", rateLimiter.Limit(authMiddleware(vendors.RegisterVendorHandler(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/vendors", rateLimiter.Limit(vendors.GetVendorsHandler(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/vendors/me", rateLimiter.Limit(authMiddleware(vendors.GetMyVendorHandler(app))))

	// Vendor CRUD
	router.HandlerFunc(http.MethodGet, "/api/v1/vendors/vendor/:vendorID", rateLimiter.Limit(vendors.GetVendorHandler(app)))
	router.HandlerFunc(http.MethodPatch, "/api/v1/vendors/vendor/:vendorID", rateLimiter.Limit(authMiddleware(vendors.UpdateVendorHandler(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/vendors/vendor/:vendorID", rateLimiter.Limit(authMiddleware(vendors.UpdateVendorHandler(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/vendors/vendor/:vendorID", rateLimiter.Limit(authMiddleware(vendors.DeleteVendorHandler(app))))

	// Event vendor hiring
	router.HandlerFunc(http.MethodPost, "/api/v1/vendors/events/:eventID/hire", rateLimiter.Limit(authMiddleware(vendors.HireVendorHandler(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/vendors/events/:eventID", rateLimiter.Limit(vendors.GetEventVendorsHandler(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/vendors/events/:eventID/vendor/:vendorID", rateLimiter.Limit(authMiddleware(vendors.RemoveVendorHandler(app))))
	router.HandlerFunc(http.MethodPatch, "/api/v1/vendors/hiring/:hiringID/status", rateLimiter.Limit(authMiddleware(vendors.UpdateVendorStatusHandler(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/vendors/me/requests", rateLimiter.Limit(authMiddleware(vendors.GetMyVendorRequestsHandler(app))))

	// Vendor availability
	router.HandlerFunc(http.MethodGet, "/api/v1/vendors/vendor/:vendorID/availability", rateLimiter.Limit(vendors.ListAvailabilityHandler(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/vendors/vendor/:vendorID/availability", rateLimiter.Limit(authMiddleware(vendors.CreateAvailabilityHandler(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/vendors/vendor/:vendorID/availability/:slotID", rateLimiter.Limit(authMiddleware(vendors.DeleteAvailabilityHandler(app))))
}

// Search Routes - Public endpoints for search functionality
func AddSearchRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	// Autocomplete suggestions - public, rate-limited
	router.HandlerFunc(http.MethodGet, "/api/v1/ac", rateLimiter.Limit(search.SearchAutocomplete(app)))

	// Search by entity type - public, rate-limited
	router.HandlerFunc(http.MethodGet, "/api/v1/search/:tabId", rateLimiter.Limit(search.SearchByType(app)))
}
