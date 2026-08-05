package filemgr

import "errors"

type EntityType string
type PictureType string

const (
	EntityArtist   EntityType = "artist"
	EntityBaito    EntityType = "baito"
	EntityBlogPost EntityType = "blogpost"
	EntityChat     EntityType = "chat"
	EntityCrop     EntityType = "crop"
	EntityEvent    EntityType = "event"
	EntityFarm     EntityType = "farm"
	EntityFeed     EntityType = "feedpost"
	EntityLive     EntityType = "live"
	EntityMedia    EntityType = "media"
	EntityMenu     EntityType = "menu"
	EntityMerch    EntityType = "merch"
	EntityMusic    EntityType = "music"
	EntityPlace    EntityType = "place"
	EntityProduct  EntityType = "product"
	EntityRecipe   EntityType = "recipe"
	EntityReport   EntityType = "report"
	EntityReview   EntityType = "review"
	EntitySong     EntityType = "song"
	EntityUser     EntityType = "user"
	EntityVendor   EntityType = "vendor"
	EntityWorker   EntityType = "worker"
)

const (
	PicAudio    PictureType = "audio"
	PicBanner   PictureType = "banner"
	PicDocument PictureType = "document"
	PicFile     PictureType = "file"
	PicMember   PictureType = "member"
	PicPhoto    PictureType = "photo"
	PicImage    PictureType = "images"
	PicPoster   PictureType = "poster"
	PicSeating  PictureType = "seating"
	PicSong     PictureType = "song"
	PicThumb    PictureType = "thumb"
	PicVideo    PictureType = "video"
)

var (
	AllowedExtensions = map[PictureType][]string{
		PicAudio:    {".mp3", ".wav", ".aac", ".m4a"},
		PicBanner:   {".jpg", ".jpeg", ".png", ".webp"},
		PicDocument: {".pdf"},
		PicFile: {
			".pdf",
			".jpg", ".jpeg", ".png", ".gif", ".webp",
			".mp3", ".wav", ".aac", ".m4a",
			".mp4", ".webm",
		},
		PicMember:  {".jpg", ".jpeg", ".png", ".webp"},
		PicPhoto:   {".jpg", ".jpeg", ".png", ".gif", ".webp"},
		PicPoster:  {".jpg", ".jpeg", ".png", ".webp"},
		PicSeating: {".jpg", ".jpeg", ".png", ".webp"},
		PicSong:    {".mp3", ".wav", ".aac", ".m4a"},
		PicThumb:   {".jpg", ".jpeg", ".png"},
		PicVideo:   {".mp4", ".webm"},
	}

	AllowedMIMEs = map[PictureType][]string{
		PicAudio:    {"audio/mpeg", "audio/wav", "audio/aac", "audio/mp4", "video/mp4"},
		PicBanner:   {"image/jpeg", "image/png", "image/webp"},
		PicDocument: {"application/pdf"},
		PicFile: {
			"application/pdf",
			"image/jpeg", "image/png", "image/gif", "image/webp",
			"audio/mpeg", "audio/wav", "audio/aac", "audio/mp4",
			"video/mp4", "video/webm",
		},
		PicMember:  {"image/jpeg", "image/png", "image/webp"},
		PicPhoto:   {"image/jpeg", "image/png", "image/gif", "image/webp"},
		PicPoster:  {"image/jpeg", "image/png", "image/webp"},
		PicSeating: {"image/jpeg", "image/png", "image/webp"},
		PicSong:    {"audio/mpeg", "audio/wav", "audio/aac", "audio/mp4", "video/mp4"},
		PicThumb:   {"image/jpeg", "image/png"},
		PicVideo:   {"video/mp4", "video/webm"},
	}

	PictureSubfolders = map[PictureType]string{
		PicAudio:    "audio",
		PicBanner:   "banner",
		PicDocument: "docs",
		PicFile:     "files",
		PicMember:   "member",
		PicPhoto:    "photo",
		PicPoster:   "poster",
		PicSeating:  "seating",
		PicSong:     "song",
		PicThumb:    "thumb",
		PicVideo:    "videos",
	}

	ErrFileTooLarge     = errors.New("file size exceeds limit")
	ErrInvalidExtension = errors.New("invalid file extension")
	ErrInvalidMIME      = errors.New("invalid MIME type")

	LogFunc func(path string, size int64, mimeType string)
)
