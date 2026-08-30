package routes

import (
	"scav/infra"
	"scav/internal/artists"
	"scav/internal/auth"
	"scav/internal/baito"
	"scav/internal/baito/jobs"
	"scav/internal/baito/vendors"
	"scav/internal/baito/workers"
	"scav/internal/beats/activity"
	"scav/internal/beats/ads"
	"scav/internal/beats/analytics"
	"scav/internal/beats/autocomplete"
	"scav/internal/beats/follows"
	"scav/internal/beats/hashtags"
	"scav/internal/beats/likes"
	"scav/internal/beats/notifications"
	"scav/internal/beats/subscribe"
	"scav/internal/beats/suggestions"
	"scav/internal/booking"
	"scav/internal/cart"
	"scav/internal/comments"
	"scav/internal/deliveries"
	"scav/internal/deliveries/delwebhooks"
	"scav/internal/deliveries/drivers"
	"scav/internal/deliveries/tracking"
	"scav/internal/events"
	"scav/internal/faqs"
	"scav/internal/farms"
	"scav/internal/farms/crops"
	"scav/internal/itinerary"
	"scav/internal/maps"
	"scav/internal/media"
	"scav/internal/media/fanmade"
	"scav/internal/menu"
	"scav/internal/merch"
	"scav/internal/musicon"
	"scav/internal/notices"
	"scav/internal/pay"
	"scav/internal/pay/stripe"
	"scav/internal/places"
	"scav/internal/posts"
	"scav/internal/products"
	"scav/internal/profile"
	"scav/internal/recipes"
	"scav/internal/reports"
	"scav/internal/reviews"
	"scav/internal/search"
	"scav/internal/settings"
	"scav/internal/songs"
	"scav/internal/tickets"
	"scav/internal/userdata"
	"scav/middleware"

	"github.com/julienschmidt/httprouter"
)

func RoutesWrapper(router *httprouter.Router, app *infra.Deps, rateLimiter *middleware.RateLimiter) {
	activity.AddActivityRoutes(router, app, rateLimiter)
	ads.AddAdsRoutes(router, app, rateLimiter)
	analytics.AddAnalyticsRoutes(router, app, rateLimiter)
	artists.AddArtistRoutes(router, app, rateLimiter)
	auth.AddAuthRoutes(router, app, rateLimiter)
	autocomplete.AddAutocompleteRoutes(router, app, rateLimiter)
	baito.AddBaitoRoutes(router, app, rateLimiter)
	booking.AddBookingRoutes(router, app, rateLimiter)
	cart.AddCartRoutes(router, app, rateLimiter)
	comments.AddCommentsRoutes(router, app, rateLimiter)
	crops.AddCropRoutes(router, app, rateLimiter)
	deliveries.AddDeliveryRoutes(router, app, rateLimiter)
	delwebhooks.AddDelWebhookRoutes(router, app, rateLimiter)
	drivers.AddDriverRoutes(router, app, rateLimiter)
	events.AddEventsRoutes(router, app, rateLimiter)
	fanmade.AddFanmadeRoutes(router, app, rateLimiter)
	faqs.AddFAQRoutes(router, app, rateLimiter)
	farms.AddFarmRoutes(router, app, rateLimiter)
	follows.AddFollowRoutes(router, app, rateLimiter)
	hashtags.AddHashtagRoutes(router, app, rateLimiter)
	itinerary.AddItineraryRoutes(router, app, rateLimiter)
	jobs.AddJobRoutes(router, app, rateLimiter)
	likes.AddLikesRoutes(router, app, rateLimiter)
	maps.AddMapRoutes(router, app, rateLimiter)
	media.AddMediaRoutes(router, app, rateLimiter)
	menu.AddMenuRoutes(router, app, rateLimiter)
	merch.AddMerchRoutes(router, app, rateLimiter)
	musicon.AddMusicRoutes(router, app, rateLimiter)
	notices.AddNoticesRoutes(router, app, rateLimiter)
	notifications.AddNotificationsRoutes(router, app, rateLimiter)
	pay.AddPayRoutes(router, app, rateLimiter)
	places.AddPlaceRoutes(router, app, rateLimiter)
	places.AddPlaceTabRoutes(router, app, rateLimiter)
	posts.AddPostRoutes(router, app, rateLimiter)
	products.AddProductRoutes(router, app, rateLimiter)
	profile.AddProfileRoutes(router, app, rateLimiter)
	recipes.AddRecipeRoutes(router, app, rateLimiter)
	reports.AddReportingRoutes(router, app, rateLimiter)
	reviews.AddReviewsRoutes(router, app, rateLimiter)
	search.AddSearchRoutes(router, app, rateLimiter)
	settings.AddSettingsRoutes(router, app, rateLimiter)
	songs.AddSongsRoutes(router, app, rateLimiter)
	stripe.AddStripeRoutes(router, app, rateLimiter)
	subscribe.AddSubscribeRoutes(router, app, rateLimiter)
	suggestions.AddSuggestionsRoutes(router, app, rateLimiter)
	tickets.AddTicketRoutes(router, app, rateLimiter)
	tracking.AddTrackingRoutes(router, app, rateLimiter)
	userdata.AddUserdataRoutes(router, app, rateLimiter)
	vendors.AddVendorRoutes(router, app, rateLimiter)
	workers.AddWorkerRoutes(router, app, rateLimiter)

	AddHomeRoutes(router, app, rateLimiter)
	AddUtilityRoutes(router, app, rateLimiter)
	AddMiscRoutes(router, app, rateLimiter)
}
