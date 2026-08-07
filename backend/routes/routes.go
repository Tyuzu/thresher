package routes

import (
	"naevis/infra"
	"naevis/internal/artists"
	"naevis/internal/artists/musicon"
	"naevis/internal/artists/songs"
	"naevis/internal/auth"
	"naevis/internal/autocomplete"
	"naevis/internal/baito"
	"naevis/internal/baito/workers"
	"naevis/internal/beats"
	"naevis/internal/booking"
	"naevis/internal/cart"
	"naevis/internal/events"
	"naevis/internal/fanmade"
	"naevis/internal/faqs"
	"naevis/internal/farms"
	"naevis/internal/farms/crops"
	"naevis/internal/farms/products"
	"naevis/internal/feed"
	"naevis/internal/hashtags"
	"naevis/internal/home"
	"naevis/internal/itinerary"
	"naevis/internal/jobs"
	"naevis/internal/maps"
	"naevis/internal/mechat"
	"naevis/internal/media"
	"naevis/internal/menu"
	"naevis/internal/merch"
	"naevis/internal/metrics/activity"
	"naevis/internal/metrics/ads"
	"naevis/internal/metrics/analytics"
	"naevis/internal/newchat"
	"naevis/internal/notices"
	"naevis/internal/places"
	"naevis/internal/posts"
	"naevis/internal/profile"
	"naevis/internal/recipes"
	"naevis/internal/reviews"
	"naevis/internal/search"
	"naevis/internal/settings"
	"naevis/internal/stripe"
	"naevis/internal/suggestions"
	"naevis/internal/userdata"
	"naevis/internal/userdata/metadata"
	"naevis/internal/vendors"
	"naevis/middleware"
	"naevis/utils"
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
	router.HandlerFunc(http.MethodPost, "/api/v1/baitos/profile", authmidware(workers.CreateWorkerProfile(app)))
	router.HandlerFunc(http.MethodPatch, "/api/v1/baitos/profile/:workerId", authmidware(workers.UpdateWorkerProfile(app)))

	// Worker directory (probably private) → require auth
	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/workers", rateLimiter.Limit(workers.GetWorkers(app)))

	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/workers/skills", rateLimiter.Limit(workers.GetWorkerSkills(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/baitos/worker/:workerId", rateLimiter.Limit(workers.GetWorkerById(app)))
}

func AddBeatRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// User must be logged in to like/unlike
	router.HandlerFunc(http.MethodPut, "/api/v1/likes/:entitytype/like/:entityid", rateLimiter.Limit(authmidware(beats.ToggleLike(app))))

	// Get users who liked a post/beat
	router.HandlerFunc(http.MethodGet, "/api/v1/likes/:entitytype/users/:entityid", rateLimiter.Limit(authmidware(beats.GetLikers(app))))

	// Batch check user likes
	router.HandlerFunc(http.MethodPost, "/api/v1/likes/:entitytype/batch/users", rateLimiter.Limit(authmidware(beats.BatchUserLikes(app))))

	// Like count is public
	router.HandlerFunc(http.MethodGet, "/api/v1/likes/:entitytype/count/:entityid", rateLimiter.Limit(beats.GetLikeCount(app)))

	// Follows
	router.HandlerFunc(http.MethodPut, "/api/v1/follows/:id", rateLimiter.Limit(authmidware(beats.ToggleFollow(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/follows/:id", rateLimiter.Limit(authmidware(beats.ToggleUnFollow(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/follows/:id/status", rateLimiter.Limit(authmidware(beats.DoesFollow(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/followers/:id", rateLimiter.Limit(beats.GetFollowers(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/following/:id", rateLimiter.Limit(beats.GetFollowing(app)))

	// Subscribes / Follows
	router.HandlerFunc(http.MethodPut, "/api/v1/subscribes/:id", rateLimiter.Limit(authmidware(beats.SubscribeEntity(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/subscribes/:id", rateLimiter.Limit(authmidware(beats.UnsubscribeEntity(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/subscribes/:id", rateLimiter.Limit(authmidware(beats.DoesSubscribeEntity(app))))

	// Get all subscribers of a user/artist
	router.HandlerFunc(http.MethodGet, "/api/v1/subscribers/:id", rateLimiter.Limit(beats.GetSubscribers(app)))

}

func AddRecipeRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/recipes/tags", rateLimiter.Limit(recipes.GetRecipeTags(app)))         // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/recipes", middleware.OptionalAuth(recipes.GetRecipes(app)))           // Public/optional
	router.HandlerFunc(http.MethodGet, "/api/v1/recipes/recipe/:id", middleware.OptionalAuth(recipes.GetRecipe(app))) // Public/optional

	// Modifications require auth
	router.HandlerFunc(http.MethodPost, "/api/v1/recipes", authmidware(recipes.CreateRecipe(app)))
	router.HandlerFunc(http.MethodPut, "/api/v1/recipes/recipe/:id", authmidware(recipes.UpdateRecipe(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/recipes/recipe/:id", authmidware(recipes.DeleteRecipe(app)))
}

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

func AddCartRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Cart operations
	router.HandlerFunc(http.MethodPost, "/api/v1/cart", rateLimiter.Limit(authmidware(cart.AddToCart(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/cart", authmidware(cart.GetCart(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/cart/update", rateLimiter.Limit(authmidware(cart.UpdateCart(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/cart/item", rateLimiter.Limit(authmidware(cart.RemoveFromCart(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/cart", rateLimiter.Limit(authmidware(cart.ClearCart(app))))
	router.HandlerFunc(http.MethodPatch, "/api/v1/cart/item", rateLimiter.Limit(authmidware(cart.UpdateItemQuantity(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/cart/checkout", rateLimiter.Limit(authmidware(cart.InitiateCheckout(app))))

	// Checkout session creation
	router.HandlerFunc(http.MethodPost, "/api/v1/checkout/session", rateLimiter.Limit(authmidware(cart.CreateCheckoutSession(app))))

	// Order placement
	router.HandlerFunc(http.MethodPost, "/api/v1/order", rateLimiter.Limit(authmidware(cart.PlaceOrder(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/order/mine", authmidware(cart.GetMyOrders(app)))

	router.HandlerFunc(http.MethodPost, "/api/v1/coupon/validate", rateLimiter.Limit(authmidware(cart.ValidateCouponHandler(app))))

}

func RegisterFarmRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// 🌾 Farm CRUD
	router.HandlerFunc(http.MethodPost, "/api/v1/farms", rateLimiter.Limit(authmidware(farms.CreateFarm(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/farms", farms.GetPaginatedFarms(app)) // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/farms/farm/:id", middleware.OptionalAuth(farms.GetFarm(app)))
	router.HandlerFunc(http.MethodPut, "/api/v1/farms/farm/:id", rateLimiter.Limit(authmidware(farms.EditFarm(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/farms/farm/:id", rateLimiter.Limit(authmidware(farms.DeleteFarm(app))))

	// 🌱 Crops (within farm)
	router.HandlerFunc(http.MethodPost, "/api/v1/farms/farm/:id/crops", rateLimiter.Limit(authmidware(crops.AddCrop(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/farms/farm/:id/crops/:cropid", rateLimiter.Limit(authmidware(crops.EditCrop(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/farms/farm/:id/crops/:cropid", rateLimiter.Limit(authmidware(crops.DeleteCrop(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/farms/farm/:id/crops/:cropid/buy", rateLimiter.Limit(authmidware(products.BuyCrop(app))))

	// 📊 Dashboard
	router.HandlerFunc(http.MethodGet, "/api/v1/dash/farms", authmidware(farms.GetFarmDash(app)))

	// 📦 Farm Orders
	router.HandlerFunc(http.MethodGet, "/api/v1/orders/mine", authmidware(products.GetMyFarmOrders(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/orders/incoming", authmidware(products.GetIncomingFarmOrders(app)))

	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/order/:id/accept", rateLimiter.Limit(authmidware(products.AcceptOrder(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/order/:id/reject", rateLimiter.Limit(authmidware(products.RejectOrder(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/order/:id/deliver", rateLimiter.Limit(authmidware(products.MarkOrderDelivered(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/order/:id/markpaid", rateLimiter.Limit(authmidware(products.MarkOrderPaid(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/farmorders/order/:id/receipt", authmidware(products.DownloadReceipt(app)))
	// Bulk actions
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/bulk/accept", rateLimiter.Limit(authmidware(products.BulkAcceptOrders(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/bulk/reject", rateLimiter.Limit(authmidware(products.BulkRejectOrders(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/farmorders/bulk/deliver", rateLimiter.Limit(authmidware(products.BulkMarkOrdersDelivered(app))))

	// 🌾 Crop catalogue & type browsing
	router.HandlerFunc(http.MethodGet, "/api/v1/crops", crops.GetFilteredCrops(app))                 // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/crops/catalogue", crops.GetCropCatalogue(app))       // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/crops/precatalogue", crops.GetPreCropCatalogue(app)) // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/crops/types", crops.GetCropTypes(app))               // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/crops/crop/:cropname", middleware.OptionalAuth(farms.GetCropTypeFarms(app)))

	// Crop Wiki
	router.HandlerFunc(http.MethodGet, "/api/v1/crops/about", rateLimiter.Limit(crops.GetAllCropAboutsHandler(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/crops/about", rateLimiter.Limit(crops.CreateCropAboutHandler(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/crops/about/:cropid", rateLimiter.Limit(crops.GetCropAboutHandler(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/crops/about/:cropid", rateLimiter.Limit(crops.DeleteCropAboutHandler(app)))
	router.HandlerFunc(http.MethodPut, "/api/v1/crops/about/:cropid", rateLimiter.Limit(crops.UpdateCropAboutHandler(app)))

	// 🛒 Items, Products, Tools
	// -- GET
	router.HandlerFunc(http.MethodGet, "/api/v1/farm/items", products.GetItems(app))                     // Public
	router.HandlerFunc(http.MethodGet, "/api/v1/farm/items/categories", products.GetItemCategories(app)) // Public

	// -- Products (CRUD)
	router.HandlerFunc(http.MethodPost, "/api/v1/farm/product", rateLimiter.Limit(authmidware(products.CreateProduct(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/farm/product/:id", rateLimiter.Limit(authmidware(products.UpdateProduct(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/farm/product/:id", rateLimiter.Limit(authmidware(products.DeleteProduct(app))))

	// -- Tools (CRUD)
	router.HandlerFunc(http.MethodPost, "/api/v1/farm/tool", rateLimiter.Limit(authmidware(products.CreateTool(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/farm/tool/:id", rateLimiter.Limit(authmidware(products.UpdateTool(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/farm/tool/:id", rateLimiter.Limit(authmidware(products.DeleteTool(app))))

	// 🖼 Upload
	// router.HandlerFunc(http.MethodPost,"/api/v1/upload/images", rateLimiter.Limit(authmidware(utils.UploadImages)))

	// Weather
	router.HandlerFunc(http.MethodGet, "/api/v1/weather", farms.GetWeather(app))
	router.HandlerFunc(http.MethodGet, "/api/v1/farms/my", authmidware(farms.GetMyFarms(app)))
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

func AddReviewsRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Public view, but rate-limited
	router.HandlerFunc(http.MethodGet, "/api/v1/reviews/:entityType/:entityId", rateLimiter.Limit(reviews.GetReviews(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/reviews/:entityType/:entityId/:reviewId", rateLimiter.Limit(reviews.GetReview(app)))

	// Authenticated actions
	router.HandlerFunc(http.MethodPost, "/api/v1/reviews/:entityType/:entityId", rateLimiter.Limit(authmidware(reviews.AddReview(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/reviews/:entityType/:entityId/:reviewId", rateLimiter.Limit(authmidware(reviews.EditReview(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/reviews/:entityType/:entityId/:reviewId", rateLimiter.Limit(authmidware(reviews.DeleteReview(app))))
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

func AddFanmadeRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/fanmade/:entitytype/:entityid/:id", rateLimiter.Limit(fanmade.GetMedia(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/fanmade/:entitytype/:entityid", rateLimiter.Limit(fanmade.GetMedias(app)))

	router.HandlerFunc(http.MethodPost, "/api/v1/fanmade/:entitytype/:entityid", rateLimiter.Limit(authmidware(fanmade.AddMedia(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/fanmade/:entitytype/:entityid/:id", rateLimiter.Limit(authmidware(fanmade.EditMedia(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/fanmade/:entitytype/:entityid/:id", rateLimiter.Limit(authmidware(fanmade.DeleteMedia(app))))
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

func AddArtistRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Public read
	router.HandlerFunc(http.MethodGet, "/api/v1/artists", rateLimiter.Limit(artists.GetAllArtists(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/artists/:id", rateLimiter.Limit(artists.GetArtistByID(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/events/event/:eventid/artists", rateLimiter.Limit(artists.GetArtistsByEvent(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/artists/:id/songs", rateLimiter.Limit(songs.GetArtistsSongs(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/artists/:id/albums", rateLimiter.Limit(artists.GetArtistsAlbums(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/artists/:id/posts", rateLimiter.Limit(artists.GetArtistsPosts(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/artists/:id/merch", rateLimiter.Limit(artists.GetArtistsMerch(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/artists/:id/events", rateLimiter.Limit(artists.GetArtistEvents(app)))

	// Authenticated write
	router.HandlerFunc(http.MethodPost, "/api/v1/artists", rateLimiter.Limit(authmidware(artists.CreateArtist(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/artists/:id", rateLimiter.Limit(authmidware(artists.UpdateArtist(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/artists/:id", rateLimiter.Limit(authmidware(artists.DeleteArtistByID(app))))

	// OLD (bulk update) – optional to keep
	// router.HandlerFunc(http.MethodPut,"/api/v1/artists/:id/members", rateLimiter.Limit(authmidware(artists.UpdateArtistMembers)))

	// NEW — per-member endpoints
	router.HandlerFunc(http.MethodPost, "/api/v1/artists/:id/members",
		rateLimiter.Limit(authmidware(artists.AddArtistMember(app))))

	router.HandlerFunc(http.MethodPut, "/api/v1/artists/:id/members/:memberId",
		rateLimiter.Limit(authmidware(artists.UpdateArtistMember(app))))

	router.HandlerFunc(http.MethodDelete, "/api/v1/artists/:id/members/:memberId",
		rateLimiter.Limit(authmidware(artists.DeleteArtistMember(app))))

	router.HandlerFunc(http.MethodPost, "/api/v1/artists/:id/songs", rateLimiter.Limit(authmidware(songs.PostNewSong(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/artists/:id/songs/:songId/edit", rateLimiter.Limit(authmidware(songs.EditSong(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/artists/:id/songs/:songId", rateLimiter.Limit(authmidware(songs.DeleteSong(app))))

	router.HandlerFunc(http.MethodPut, "/api/v1/artists/:id/events/addtoevent", rateLimiter.Limit(authmidware(artists.AddArtistToEvent(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/artists/:id/events", rateLimiter.Limit(authmidware(artists.CreateArtistEvent(app))))
	router.HandlerFunc(http.MethodPut, "/api/v1/artists/:id/events", rateLimiter.Limit(authmidware(artists.UpdateArtistEvent(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/artists/:id/events", rateLimiter.Limit(authmidware(artists.DeleteArtistEvent(app))))
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

func AddFeedRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	// Public viewing
	router.HandlerFunc(http.MethodGet, "/api/v1/feed/post/:postid", rateLimiter.Limit(feed.GetPost(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/feed/feed/metadata", rateLimiter.Limit(feed.GetPostsMetadata(app)))

	// Authenticated feed actions
	router.HandlerFunc(http.MethodGet, "/api/v1/feed/feed", rateLimiter.Limit(authmidware(feed.GetPosts(app))))
	router.HandlerFunc(http.MethodGet, "/api/v1/feed/media/:entityType/:entityId", rateLimiter.Limit(authmidware(feed.GetPosts(app))))

	router.HandlerFunc(http.MethodPost, "/api/v1/feed/post", rateLimiter.Limit(authmidware(feed.CreateFeedPost(app))))
	router.HandlerFunc(http.MethodDelete, "/api/v1/feed/post/:postid", rateLimiter.Limit(authmidware(feed.DeletePost(app))))

	// NEW
	router.HandlerFunc(http.MethodPatch, "/api/v1/feed/post/:postid", rateLimiter.Limit(authmidware(feed.EditPost(app))))
	// router.HandlerFunc(http.MethodPost,"/api/v1/feed/post/:postid/subtitles/:lang", rateLimiter.Limit(authmidware(filedrop.UploadSubtitle)))
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

// AddAdsRoutes registers the ad system API routes
func AddAdsRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	router.HandlerFunc(http.MethodGet, "/api/v1/sda/sda", rateLimiter.Limit(middleware.OptionalAuth(ads.GetAds(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/sda/track-impression", rateLimiter.Limit(middleware.OptionalAuth(ads.TrackImpression(app))))
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

func AddStripeRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodPost, "/api/v1/stripe/create-payment-intent", rateLimiter.Limit(authmidware(stripe.CreatePaymentIntent(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/stripe/payment-success", rateLimiter.Limit(authmidware(stripe.PaymentSuccess(app))))
	router.HandlerFunc(http.MethodPost, "/api/v1/stripe/webhook", rateLimiter.Limit(authmidware(stripe.StripeWebhook(app))))
}

func AddMusicRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)

	// --------------------------- PLAYLISTS ---------------------------
	router.HandlerFunc(http.MethodGet,
		"/api/v1/musicon/user/playlists",
		rateLimiter.Limit(authmidware(musicon.GetUserPlaylists(app))),
	)

	router.HandlerFunc(http.MethodGet,
		"/api/v1/musicon/user/liked",
		rateLimiter.Limit(authmidware(musicon.GetUserLikes(app))),
	)

	router.HandlerFunc(http.MethodPost,
		"/api/v1/musicon/playlists",
		rateLimiter.Limit(authmidware(musicon.CreatePlaylist(app))),
	)

	router.HandlerFunc(http.MethodDelete,
		"/api/v1/musicon/playlists/:playlistid",
		rateLimiter.Limit(authmidware(musicon.DeletePlaylist(app))),
	)

	// Add / Remove songs to playlist
	router.HandlerFunc(http.MethodPost,
		"/api/v1/musicon/playlists/:playlistid/songs",
		rateLimiter.Limit(authmidware(musicon.AddSongToPlaylist(app))),
	)

	router.HandlerFunc(http.MethodDelete,
		"/api/v1/musicon/playlists/:playlistid/songs/:songid",
		rateLimiter.Limit(authmidware(musicon.RemoveSongFromPlaylist(app))),
	)

	// Playlist details
	router.HandlerFunc(http.MethodGet,
		"/api/v1/musicon/playlists/:playlistid/songs",
		rateLimiter.Limit(authmidware(musicon.GetPlaylistSongs(app))),
	)

	// Rename / Update playlist info
	router.HandlerFunc(http.MethodPatch,
		"/api/v1/musicon/playlists/:playlistid",
		rateLimiter.Limit(authmidware(musicon.UpdatePlaylistInfo(app))),
	)

	// --------------------------- LIKES ---------------------------

	// Like song (idempotent)
	router.HandlerFunc(http.MethodPost,
		"/api/v1/musicon/user/liked/:songid",
		rateLimiter.Limit(authmidware(musicon.LikeSong(app))),
	)

	// Unlike song (idempotent)
	router.HandlerFunc(http.MethodDelete,
		"/api/v1/musicon/user/liked/:songid",
		rateLimiter.Limit(authmidware(musicon.UnlikeSong(app))),
	)

	// --------------------------- ARTISTS ---------------------------
	router.HandlerFunc(http.MethodGet,
		"/api/v1/musicon/artists/:artistid/songs",
		rateLimiter.Limit(middleware.OptionalAuth(musicon.GetArtistsSongs(app))),
	)

	// --------------------------- ALBUMS ---------------------------
	router.HandlerFunc(http.MethodGet,
		"/api/v1/musicon/albums",
		rateLimiter.Limit(middleware.OptionalAuth(musicon.GetAlbums(app))),
	)

	router.HandlerFunc(http.MethodGet,
		"/api/v1/musicon/albums/:albumid/songs",
		rateLimiter.Limit(middleware.OptionalAuth(musicon.GetAlbumSongs(app))),
	)

	router.HandlerFunc(http.MethodGet,
		"/api/v1/musicon/recommended/albums",
		rateLimiter.Limit(middleware.OptionalAuth(musicon.GetRecommendedAlbums(app))),
	)

	// --------------------------- SONGS & RECOMMENDATIONS ---------------------------
	router.HandlerFunc(http.MethodGet,
		"/api/v1/musicon/recommended",
		rateLimiter.Limit(middleware.OptionalAuth(musicon.GetRecommendedSongs(app))),
	)

	router.HandlerFunc(http.MethodGet,
		"/api/v1/musicon/recommendations",
		rateLimiter.Limit(middleware.OptionalAuth(musicon.GetRecommendations(app))),
	)
}

/* func AddMusicRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	--------------------------- PLAYLISTS ---------------------------
	router.HandlerFunc(http.MethodGet,"/api/v1/musicon/user/playlists", rateLimiter.Limit(middleware.OptionalAuth(musicon.GetUserPlaylists(app))))
	router.HandlerFunc(http.MethodGet,"/api/v1/musicon/user/liked", rateLimiter.Limit(middleware.OptionalAuth(musicon.GetUserLikes(app))))
	router.HandlerFunc(http.MethodPost,"/api/v1/musicon/playlists", rateLimiter.Limit(authmidware(musicon.CreatePlaylist(app))))
	router.HandlerFunc(http.MethodDelete,"/api/v1/musicon/playlists/:playlistid", rateLimiter.Limit(authmidware(musicon.DeletePlaylist(app))))

	Add / Remove songs to playlist
	router.HandlerFunc(http.MethodPost,"/api/v1/musicon/playlists/:playlistid/songs/:songid", rateLimiter.Limit(authmidware(musicon.AddSongToPlaylist)))
	router.HandlerFunc(http.MethodPost,"/api/v1/musicon/playlists/:playlistid/songs", rateLimiter.Limit(authmidware(musicon.AddSongToPlaylist(app))))
	router.HandlerFunc(http.MethodPost,"/api/v1/musicon/user/liked/:songid", rateLimiter.Limit(middleware.OptionalAuth(musicon.SetUserLikes(app))))
	router.HandlerFunc(http.MethodDelete,"/api/v1/musicon/playlists/:playlistid/songs/:songid", rateLimiter.Limit(authmidware(musicon.RemoveSongFromPlaylist(app))))

	Playlist details
	router.HandlerFunc(http.MethodGet,"/api/v1/musicon/playlists/:playlistid/songs", rateLimiter.Limit(middleware.OptionalAuth(musicon.GetPlaylistSongs(app))))

	Rename / Update playlist info
	router.HandlerFunc(http.MethodPatch,"/api/v1/musicon/playlists/:playlistid", rateLimiter.Limit(authmidware(musicon.UpdatePlaylistInfo(app))))

	--------------------------- ARTISTS ---------------------------
	router.HandlerFunc(http.MethodGet,"/api/v1/musicon/artists/:artistid/songs", rateLimiter.Limit(middleware.OptionalAuth(musicon.GetArtistsSongs(app))))

	--------------------------- ALBUMS ---------------------------
	router.HandlerFunc(http.MethodGet,"/api/v1/musicon/albums", rateLimiter.Limit(middleware.OptionalAuth(musicon.GetAlbums(app))))
	router.HandlerFunc(http.MethodGet,"/api/v1/musicon/albums/:albumid/songs", rateLimiter.Limit(middleware.OptionalAuth(musicon.GetAlbumSongs(app))))
	router.HandlerFunc(http.MethodGet,"/api/v1/musicon/recommended/albums", rateLimiter.Limit(middleware.OptionalAuth(musicon.GetRecommendedAlbums(app))))

	--------------------------- SONGS & RECOMMENDATIONS ---------------------------
	router.HandlerFunc(http.MethodGet,"/api/v1/musicon/recommended", rateLimiter.Limit(middleware.OptionalAuth(musicon.GetRecommendedSongs(app))))

	Dynamic personalized recommendations
	router.HandlerFunc(http.MethodGet,"/api/v1/musicon/recommendations", rateLimiter.Limit(middleware.OptionalAuth(musicon.GetRecommendations(app))))
} */

// func AddDiscordRoutes(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
// 	// authmidware := middleware.Authenticate(app)

// }

func AddMeChatRoutes(router *httprouter.Router, hub *mechat.Hub, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/merechats/all", authmidware(mechat.GetUserChats(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/merechats/start", authmidware(mechat.StartNewChat(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/merechats/chat/:chatid", authmidware(mechat.GetChatByID(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/merechats/chat/:chatid/messages", authmidware(mechat.GetChatMessages(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/merechats/chat/:chatid/message", authmidware(mechat.SendMessageREST(app)))
	router.HandlerFunc(http.MethodPatch, "/api/v1/merechats/messages/:messageid", authmidware(mechat.EditMessage(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/merechats/messages/:messageid", authmidware(mechat.DeleteMessage(app)))

	router.HandlerFunc(http.MethodGet, "/ws/merechat", authmidware(
		mechat.HandleWebSocket(app, hub),
	))

	router.HandlerFunc(http.MethodPost, "/api/v1/merechats/chat/:chatid/upload", authmidware(mechat.UploadAttachment(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/merechats/chat/:chatid/search", authmidware(mechat.SearchMessages(app)))
	router.HandlerFunc(http.MethodGet, "/api/v1/merechats/messages/unread-count", authmidware(mechat.GetUnreadCount(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/merechats/messages/:messageid/read", authmidware(mechat.MarkAsRead(app)))
}

func AddNewChatRoutes(router *httprouter.Router, hub *newchat.Hub, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	authmidware := middleware.Authenticate(app)
	router.HandlerFunc(http.MethodGet, "/api/v1/newchats/all", authmidware(newchat.GetUserChats(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/newchats/init", authmidware(newchat.InitChat(app)))

	// This should likely be protected; token could be in query or header
	router.HandlerFunc(http.MethodGet, "/ws/newchat/chat/:room", authmidware(newchat.WebSocketHandler(hub, app)))

	router.HandlerFunc(http.MethodPost, "/api/v1/newchat/edit", authmidware(newchat.EditMessageHandler(hub, app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/newchat/delete", authmidware(newchat.DeleteMessageHandler(hub, app)))

	// router.HandlerFunc(http.MethodGet,"/newchat/:room/poll", authmidware(newchat.PollMessagesHandler))

	router.HandlerFunc(http.MethodPost, "/api/v1/newchat/upload", authmidware(newchat.UploadHandler(hub, app)))

	router.HandlerFunc(http.MethodGet, "/api/v1/newchat/chat/:room", authmidware(newchat.GetChat(app)))
	router.HandlerFunc(http.MethodPost, "/api/v1/newchat/chat/:room/message", authmidware(newchat.CreateMessage(app)))
	router.HandlerFunc(http.MethodDelete, "/api/v1/newchat/chat/:room/message/:msgid", authmidware(newchat.DeletesMessage(app)))

	/**/

	router.HandlerFunc(http.MethodPut, "/api/v1/newchat/chat:room/message/:msgid", authmidware(newchat.UpdateMessage(app)))

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
