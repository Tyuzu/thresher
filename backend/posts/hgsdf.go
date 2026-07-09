package posts

import (
	"encoding/json"
	"html"
	"naevis/config"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
)

const (
	BlockText  = "text"
	BlockImage = "image"
	BlockCode  = "code"
	BlockVideo = "video"
)

const (
	PostStandard = "standard"
	PostGuide    = "guide"
	PostTutorial = "tutorial"
	PostRecipe   = "recipe"
)

const (
	CategoryReview = "Review"

	SubcategoryProduct = "Product"
	SubcategoryPlace   = "Place"
	SubcategoryEvent   = "Event"
)

type PostInput struct {
	Type        string
	Title       string
	Category    string
	Subcategory string
	ReferenceID string
	Blocks      []models.Block
	Hashtags    []string
}

func isValidPostType(t string) bool {
	switch t {
	case PostStandard,
		PostGuide,
		PostTutorial,
		PostRecipe:
		return true
	default:
		return false
	}
}

func requiresReference(category, subcategory string) bool {
	if category != CategoryReview {
		return false
	}

	switch subcategory {
	case SubcategoryProduct,
		SubcategoryPlace,
		SubcategoryEvent:
		return true
	default:
		return false
	}
}

func sanitizeTextBlock(b models.Block) (models.Block, bool) {
	b.Content = strings.TrimSpace(html.EscapeString(b.Content))
	return b, b.Content != ""
}

func sanitizeImageBlock(b models.Block) (models.Block, bool) {
	b.URL = strings.TrimSpace(b.URL)
	b.Alt = strings.TrimSpace(html.EscapeString(b.Alt))
	b.Caption = strings.TrimSpace(html.EscapeString(b.Caption))
	return b, b.URL != ""
}

func sanitizeCodeBlock(b models.Block) (models.Block, bool) {
	b.Language = strings.TrimSpace(html.EscapeString(b.Language))
	b.Content = strings.TrimSpace(html.EscapeString(b.Content))
	return b, b.Content != ""
}

func sanitizeVideoBlock(b models.Block) (models.Block, bool) {
	b.URL = strings.TrimSpace(b.URL)
	b.Caption = strings.TrimSpace(html.EscapeString(b.Caption))
	return b, b.URL != ""
}

func sanitizeBlocks(raw []models.Block) []models.Block {
	out := make([]models.Block, 0, len(raw))

	for _, b := range raw {
		var ok bool

		switch b.Type {
		case BlockText:
			b, ok = sanitizeTextBlock(b)

		case BlockImage:
			b, ok = sanitizeImageBlock(b)

		case BlockCode:
			b, ok = sanitizeCodeBlock(b)

		case BlockVideo:
			b, ok = sanitizeVideoBlock(b)

		default:
			continue
		}

		if ok {
			out = append(out, b)
		}
	}

	return out
}

func pickThumb(blocks []models.Block) string {
	for _, b := range blocks {
		if b.Type == BlockImage && b.URL != "" {
			return b.URL
		}
	}

	for _, b := range blocks {
		if b.Type == BlockVideo && b.URL != "" {
			return b.URL
		}
	}

	return ""
}

func parsePostInput(r *http.Request) (*PostInput, error) {
	if err := r.ParseMultipartForm(20 << 20); err != nil {
		return nil, err
	}

	postType := strings.TrimSpace(r.FormValue("type"))
	if postType == "" {
		postType = PostStandard
	}

	title := strings.TrimSpace(html.EscapeString(r.FormValue("title")))
	category := strings.TrimSpace(r.FormValue("category"))
	subcategory := strings.TrimSpace(r.FormValue("subcategory"))
	referenceID := strings.TrimSpace(r.FormValue("referenceId"))
	blocksRaw := r.FormValue("blocks")

	var blocksIn []models.Block
	if err := json.Unmarshal([]byte(blocksRaw), &blocksIn); err != nil {
		return nil, err
	}

	rawTags := r.MultipartForm.Value["hashtags"]
	hashtags := make([]string, 0, len(rawTags))

	for _, tag := range rawTags {
		tag = strings.TrimSpace(html.EscapeString(tag))
		if tag != "" {
			hashtags = append(hashtags, tag)
		}
	}

	return &PostInput{
		Type:        postType,
		Title:       title,
		Category:    category,
		Subcategory: subcategory,
		ReferenceID: referenceID,
		Blocks:      sanitizeBlocks(blocksIn),
		Hashtags:    hashtags,
	}, nil
}

func CreateOrUpdatePost(
	w http.ResponseWriter,
	r *http.Request,
	ps httprouter.Params,
	isEdit bool,
	app *infra.Deps,
) {
	ctx := r.Context()

	userID, ok := ctx.Value(config.UserIDKey).(string)
	if !ok || userID == "" {
		utils.RespondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var postID string

	if isEdit {
		postID = ps.ByName("id")

		if postID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Post ID required")
			return
		}
	}

	input, err := parsePostInput(r)
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid form data")
		return
	}

	if !isValidPostType(input.Type) {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid post type")
		return
	}

	if input.Title == "" ||
		input.Category == "" ||
		input.Subcategory == "" ||
		len(input.Blocks) == 0 {
		utils.RespondWithError(w, http.StatusBadRequest, "Missing required fields")
		return
	}

	var refPtr *string

	if requiresReference(input.Category, input.Subcategory) {
		if input.ReferenceID == "" {
			utils.RespondWithError(w, http.StatusBadRequest, "Reference ID required")
			return
		}

		refPtr = &input.ReferenceID
	}

	now := time.Now()

	if isEdit {
		filter := map[string]any{
			"postid":    postID,
			"createdBy": userID,
		}

		update := map[string]any{
			"type":        input.Type,
			"title":       input.Title,
			"category":    input.Category,
			"subcategory": input.Subcategory,
			"referenceId": refPtr,
			"blocks":      input.Blocks,
			"hashtags":    input.Hashtags,
			"thumb":       pickThumb(input.Blocks),
			"updatedAt":   now,
		}

		if err := app.DB.UpdateOne(
			ctx,
			blogPostsCollection,
			filter,
			update,
		); err != nil {
			utils.RespondWithError(
				w,
				http.StatusInternalServerError,
				"Failed to update post",
			)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"postid": postID,
		})
		return
	}

	post := models.BlogPost{
		PostID:      uuid.NewString(),
		Type:        input.Type,
		Title:       input.Title,
		Category:    input.Category,
		Subcategory: input.Subcategory,
		ReferenceID: refPtr,
		Blocks:      input.Blocks,
		Thumb:       pickThumb(input.Blocks),
		CreatedBy:   userID,
		CreatedAt:   now,
		UpdatedAt:   now,
		Hashtags:    input.Hashtags,
		Username:    utils.GetUsernameFromRequest(r),
	}

	if err := app.DB.InsertOne(
		ctx,
		blogPostsCollection,
		post,
	); err != nil {
		utils.RespondWithError(
			w,
			http.StatusInternalServerError,
			"Failed to create post",
		)
		return
	}

	mqpayload, _ := json.Marshal(mqevent.DummyPayload{})
	app.MQ.Publish(ctx, mqevent.DummyEvent, mqpayload)

	utils.RespondWithJSON(w, http.StatusOK, map[string]any{
		"postid": post.PostID,
	})
}

func CreatePost(app *infra.Deps) httprouter.Handle {
	return func(
		w http.ResponseWriter,
		r *http.Request,
		ps httprouter.Params,
	) {
		CreateOrUpdatePost(w, r, ps, false, app)
	}
}

func UpdatePost(app *infra.Deps) httprouter.Handle {
	return func(
		w http.ResponseWriter,
		r *http.Request,
		ps httprouter.Params,
	) {
		CreateOrUpdatePost(w, r, ps, true, app)
	}
}

func DeletePost(app *infra.Deps) httprouter.Handle {
	return func(
		w http.ResponseWriter,
		r *http.Request,
		ps httprouter.Params,
	) {
		ctx := r.Context()

		userID := utils.GetUserIDFromRequest(r)
		postID := ps.ByName("id")

		if postID == "" {
			utils.RespondWithError(
				w,
				http.StatusBadRequest,
				"Post ID required",
			)
			return
		}

		filter := map[string]any{
			"postid":    postID,
			"createdBy": userID,
		}

		_, err := app.DB.DeleteOne(
			ctx,
			blogPostsCollection,
			filter,
		)
		if err != nil {
			utils.RespondWithError(
				w,
				http.StatusInternalServerError,
				"Failed to delete post",
			)
			return
		}

		mqpayload, _ := json.Marshal(mqevent.DummyPayload{})
		app.MQ.Publish(ctx, mqevent.DummyEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"postid":  postID,
			"deleted": true,
		})
	}
}
