package ads

var (
	defaultAds = []Ad{
		{
			ID:          "1",
			Type:        TypeExternal,
			Title:       "Tech Gadget Sale",
			Description: "Get the latest gadgets at unbeatable prices!",
			Image:       "https://picsum.photos/seed/techgadgets/300/250",
			Link:        "https://example.com/tech-sale",
			Category:    "tech",
			Page:        "recipes",
			Position:    "inbody",
			Status:      "active",
		},
		{
			ID:          "2",
			Type:        TypeExternal,
			Title:       "Travel Deals",
			Description: "Explore the world with our exclusive travel packages.",
			Image:       "https://picsum.photos/seed/traveldeals/300/250",
			Link:        "https://example.com/travel-deals",
			Category:    "travel",
			Page:        "home",
			Position:    "aside",
			Status:      "active",
		},
		{
			ID:          "3",
			Type:        TypeExternal,
			Title:       "Local Restaurant",
			Description: "Taste the best food in town at amazing discounts.",
			Image:       "https://picsum.photos/seed/restaurant/728/90",
			Link:        "https://example.com/restaurant",
			Category:    "food",
			Page:        "home",
			Position:    "main-bottom",
			Status:      "active",
		},
		{
			ID:          "4",
			Type:        TypeExternal,
			Title:       "Gourmet Recipe Book",
			Description: "Master chef recipes delivered straight to your kitchen.",
			Image:       "https://picsum.photos/seed/cooking/300/250",
			Link:        "https://example.com/gourmet-book",
			Category:    "food",
			Page:        "recipes",
			Position:    "aside",
			Status:      "active",
		},
		{
			ID:          "5",
			Type:        TypeExternal,
			Title:       "Fitness & Gym Membership",
			Description: "Join today and get your first month at 50% off!",
			Image:       "https://picsum.photos/seed/fitness/728/90",
			Link:        "https://example.com/fitness-promo",
			Category:    "health",
			Page:        "home",
			Position:    "main-top",
			Status:      "active",
		},
		{
			ID:          "6",
			Type:        TypeExternal,
			Title:       "Smart Home Security",
			Description: "Protect your loved ones with next-gen automated surveillance.",
			Image:       "https://placehold.co/300x250/2d3748/ffffff?text=Smart+Home+Security",
			Link:        "https://example.com/smart-home",
			Category:    "tech",
			Page:        "recipes",
			Position:    "inbody",
			Status:      "active",
		},
	}
)

// getSafeDefaultAds returns a thread-safe copy of default ads.
func getSafeDefaultAds() []Ad {
	adsMutex.RLock()
	defer adsMutex.RUnlock()

	copied := make([]Ad, len(defaultAds))
	copy(copied, defaultAds)
	return copied
}
