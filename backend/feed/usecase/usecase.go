package usecase

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"time"

	"naevis/feed/domain"
	feedmodels "naevis/feed/models"
	db "naevis/infra/db"
	"naevis/models"
	"naevis/utils"

	"go.mongodb.org/mongo-driver/bson"
)

type FeedUsecase struct {
	repo domain.FeedRepository
}

func NewFeedUsecase(r domain.FeedRepository) *FeedUsecase {
	return &FeedUsecase{repo: r}
}

func (u *FeedUsecase) GetPost(ctx context.Context, postID string) (models.FeedPost, error) {
	post, err := u.repo.FindFeedPost(ctx, postID)
	if err != nil {
		return models.FeedPost{}, err
	}

	likeCount, err := u.repo.GetPostLikeCount(ctx, postID)
	if err == nil {
		_ = u.repo.UpdateFeedPostLikeCount(ctx, postID, likeCount)
		post.Likes = likeCount
	}

	return post, nil
}

func (u *FeedUsecase) GetPosts(ctx context.Context, opts db.FindManyOptions) ([]models.FeedPost, error) {
	posts, err := u.repo.FindFeedPosts(ctx, opts)
	if err != nil {
		return nil, err
	}

	userIDs := make([]string, 0, len(posts))
	seen := map[string]struct{}{}
	for _, p := range posts {
		if p.UserID == "" {
			continue
		}
		if _, ok := seen[p.UserID]; !ok {
			seen[p.UserID] = struct{}{}
			userIDs = append(userIDs, p.UserID)
		}
	}

	usernameMap, err := u.repo.GetCachedUsernames(ctx, userIDs)
	if err != nil {
		usernameMap = map[string]string{}
	}

	for i := range posts {
		if uname, ok := usernameMap[posts[i].UserID]; ok && uname != "" {
			posts[i].Username = uname
		} else if posts[i].Username == "" {
			posts[i].Username = "unknown"
		}
	}

	return posts, nil
}

func (u *FeedUsecase) GetPostsMetadata(ctx context.Context, userID string, postIDs []string) ([]feedmodels.PostMetadata, error) {
	likeCounts, err := u.repo.AggregateLikeCounts(ctx, postIDs)
	if err != nil {
		return nil, err
	}

	commentCounts, err := u.repo.AggregateCommentCounts(ctx, postIDs)
	if err != nil {
		return nil, err
	}

	likedByUser, err := u.repo.FindLikedPostIDsByUser(ctx, userID, postIDs)
	if err != nil {
		likedByUser = map[string]bool{}
	}

	result := make([]feedmodels.PostMetadata, 0, len(postIDs))
	for _, pid := range postIDs {
		result = append(result, feedmodels.PostMetadata{
			PostID:      pid,
			Likes:       likeCounts[pid],
			Comments:    commentCounts[pid],
			LikedByUser: likedByUser[pid],
		})
	}

	return result, nil
}

func (u *FeedUsecase) CreateOrEditPost(ctx context.Context, claims *models.Claims, payload feedmodels.PostPayload, action feedmodels.PostAction) (models.FeedPost, error) {
	var post models.FeedPost

	payload, err := u.preparePostPayload(payload)
	if err != nil {
		return post, err
	}

	switch action {
	case feedmodels.ActionCreate:
		return u.insertNewPost(ctx, claims, payload)
	case feedmodels.ActionEdit:
		return u.editExistingPost(ctx, claims, payload)
	default:
		return post, errors.New("unsupported action")
	}
}

func (u *FeedUsecase) editExistingPost(ctx context.Context, claims *models.Claims, payload feedmodels.PostPayload) (models.FeedPost, error) {
	var post models.FeedPost
	if payload.PostID == "" {
		return post, errors.New("missing postid")
	}

	update := map[string]any{}
	if payload.Text != "" {
		update["text"] = payload.Text
	}
	if payload.Title != "" {
		update["title"] = payload.Title
	}
	if payload.Description != "" {
		update["description"] = payload.Description
	}
	if len(payload.Tags) > 0 {
		update["tags"] = payload.Tags
	}
	if len(update) == 0 {
		return post, errors.New("nothing to update")
	}

	if err := u.repo.FindAndUpdateFeedPost(ctx, bson.M{"postid": payload.PostID, "userid": claims.UserID}, bson.M{"$set": update}, &post); err != nil {
		return post, err
	}

	return post, nil
}

func (u *FeedUsecase) insertNewPost(ctx context.Context, claims *models.Claims, payload feedmodels.PostPayload) (models.FeedPost, error) {
	genID, _ := utils.GenerateRandomString(12)
	post := models.FeedPost{
		PostID:      genID,
		Username:    claims.Username,
		UserID:      claims.UserID,
		Text:        payload.Text,
		Title:       payload.Title,
		Description: payload.Description,
		Tags:        payload.Tags,
		Timestamp:   time.Now().Format(time.RFC3339),
		Likes:       0,
		Type:        payload.Type,
		Subtitles:   make(map[string]string),
	}

	switch payload.Type {
	case "image":
		if len(payload.Images) == 0 {
			return post, errors.New("no images attached")
		}
		if len(payload.Images) > 6 {
			return post, errors.New("cannot attach more than 6 images")
		}
		for _, img := range payload.Images {
			post.MediaURL = append(post.MediaURL, img.Filename)
			post.Media = append(post.Media, img.Filename+img.Extn)
		}
		post.Caption = payload.Caption

	case "video":
		if payload.Video == nil {
			return post, errors.New("missing video file")
		}
		post.MediaURL = []string{payload.Video.Filename}
		post.Media = []string{payload.Video.Filename + payload.Video.Extn}
		if payload.Thumbnail != nil {
			post.Thumbnail = payload.Thumbnail.Filename + payload.Thumbnail.Extn
		}
		if len(payload.Video.Resolutions) > 0 {
			post.Resolutions = payload.Video.Resolutions
		}

	case "text":
	default:
		return post, errors.New("unsupported post type")
	}

	if err := u.repo.InsertFeedPost(ctx, post); err != nil {
		return post, err
	}

	return post, nil
}

func (u *FeedUsecase) preparePostPayload(payload feedmodels.PostPayload) (feedmodels.PostPayload, error) {
	if payload.Type == "" {
		payload.Type = "text"
	}
	payload.Type = utils.SanitizeText(payload.Type)
	payload.Text = utils.SanitizeText(payload.Text)

	if len([]rune(payload.Text)) > 500 {
		return payload, errors.New("post text exceeds 500 characters")
	}

	validPostTypes := map[string]bool{"text": true, "image": true, "video": true}
	if !validPostTypes[payload.Type] {
		return payload, errors.New("invalid post type")
	}

	if err := u.checkTextContent(payload.Text); err != nil {
		return payload, err
	}

	payload.Tags = u.sanitizeTags(payload.Tags)
	return payload, nil
}

func (u *FeedUsecase) sanitizeTags(tags []string) []string {
	seen := make(map[string]bool)
	clean := make([]string, 0, len(tags))
	for _, tag := range tags {
		t := utils.SanitizeText(tag)
		if t != "" && !seen[t] {
			seen[t] = true
			clean = append(clean, t)
		}
	}
	return clean
}

func (u *FeedUsecase) checkTextContent(text string) error {
	mentions := u.extractMentions(text)
	hashtags := u.extractHashtags(text)
	urls := u.extractURLs(text)

	banned := []string{"spamword1", "offensiveword", "bannedtopic"}
	lowered := strings.ToLower(text)
	for _, bad := range banned {
		if strings.Contains(lowered, bad) {
			return errors.New("post contains prohibited content")
		}
	}

	if len(mentions) > 0 {
		_ = mentions
	}
	if len(hashtags) > 0 {
		_ = hashtags
	}
	if len(urls) > 0 {
		_ = urls
	}

	return nil
}

var (
	mentionRegex = regexp.MustCompile(`@([a-zA-Z0-9_]{1,15})`)
	hashtagRegex = regexp.MustCompile(`#(\w+)`)
	urlRegex     = regexp.MustCompile(`https?://[^\s]+`)
)

func (u *FeedUsecase) extractMentions(text string) []string {
	matches := mentionRegex.FindAllStringSubmatch(text, -1)
	out := []string{}
	for _, m := range matches {
		if len(m) > 1 {
			out = append(out, m[1])
		}
	}
	return out
}

func (u *FeedUsecase) extractHashtags(text string) []string {
	matches := hashtagRegex.FindAllStringSubmatch(text, -1)
	out := []string{}
	for _, m := range matches {
		if len(m) > 1 {
			out = append(out, m[1])
		}
	}
	return out
}

func (u *FeedUsecase) extractURLs(text string) []string {
	return urlRegex.FindAllString(text, -1)
}
