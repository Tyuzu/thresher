package songs

// songPayload uses pointers so we can differentiate between empty strings ("")
// and omitted fields (nil) during update operations.
type songPayload struct {
	Title       *string `json:"title"`
	Genre       *string `json:"genre"`
	Duration    *string `json:"duration"`
	Description *string `json:"description"`
	Audio       *string `json:"audio"`
	Poster      *string `json:"poster"`
	AudioExtn   *string `json:"audioextn"`
	PosterExtn  *string `json:"posterextn"`
}
