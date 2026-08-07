package artists

type ArtistAlbum struct {
	Title       string `json:"title"`
	ReleaseDate string `json:"releaseDate"`
	Description string `json:"description"`
	Published   bool   `json:"published"`
}

type ArtistPost struct {
	Title     string `json:"title"`
	Content   string `json:"content"`
	CreatedAt string `json:"createdAt"`
	Published bool   `json:"published"`
}

type ArtistMerchItem struct {
	Name        string  `json:"name"`
	Price       float64 `json:"price"`
	Description string  `json:"description"`
	Image       string  `json:"image,omitempty"`
	Visible     bool    `json:"visible"`
	MerchID     string  `json:"merchid" bson:"merchid"`
}
