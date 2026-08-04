package domain

type Attachment struct {
	Filename    string `json:"filename"`
	Extension   string `json:"extension"`
	Key         string `json:"key"`
	Resolutions []int  `json:"resolutions,omitempty"`
}
