package feed

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"naevis/config"
	"naevis/infra"
	"naevis/infra/db"
	"naevis/infra/mq"
	"naevis/models"

	"github.com/golang-jwt/jwt/v5"
	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type mockFeedDB struct {
	findOneFunc             func(ctx context.Context, collection string, filter any, result any) error
	findManyWithOptionsFunc func(ctx context.Context, collection string, filter any, opts db.FindManyOptions, result any) error
	findOneAndUpdateFunc    func(ctx context.Context, collection string, filter any, update any, result any) error
	insertOneFunc           func(ctx context.Context, collection string, document any) error
	countDocumentsFunc      func(ctx context.Context, collection string, filter any) (int64, error)
	updateOneFunc           func(ctx context.Context, collection string, filter any, update any) error
	aggregateFunc           func(ctx context.Context, collection string, pipeline any, result any) error
	findManyFunc            func(ctx context.Context, collection string, filter any, result any, opts ...*options.FindOptions) error
}

func (m *mockFeedDB) Ping(ctx context.Context) error {
	return nil
}

func (m *mockFeedDB) WithDB(ctx context.Context, op func(ctx context.Context) error) error {
	return op(ctx)
}

func (m *mockFeedDB) RunTransaction(ctx context.Context, fn func(ctx context.Context) error) error {
	return fn(ctx)
}

func (m *mockFeedDB) Insert(ctx context.Context, collection string, document any) error {
	if m.insertOneFunc != nil {
		return m.insertOneFunc(ctx, collection, document)
	}
	return nil
}

func (m *mockFeedDB) InsertOne(ctx context.Context, collection string, document any) error {
	return m.Insert(ctx, collection, document)
}

func (m *mockFeedDB) InsertMany(ctx context.Context, collection string, documents []any) error {
	return nil
}

func (m *mockFeedDB) BulkWrite(ctx context.Context, collection string, operations []any) error {
	return nil
}

func (m *mockFeedDB) FindOne(ctx context.Context, collection string, filter any, result any) error {
	if m.findOneFunc != nil {
		return m.findOneFunc(ctx, collection, filter, result)
	}
	return nil
}

func (m *mockFeedDB) FindOneWithProjection(ctx context.Context, collection string, filter any, projection []string, result any) error {
	return m.FindOne(ctx, collection, filter, result)
}

func (m *mockFeedDB) FindMany(ctx context.Context, collection string, filter any, result any, opts ...*options.FindOptions) error {
	if m.findManyFunc != nil {
		return m.findManyFunc(ctx, collection, filter, result, opts...)
	}
	return nil
}

func (m *mockFeedDB) FindManyWithOptions(ctx context.Context, collection string, filter any, opts db.FindManyOptions, result any) error {
	if m.findManyWithOptionsFunc != nil {
		return m.findManyWithOptionsFunc(ctx, collection, filter, opts, result)
	}
	return nil
}

func (m *mockFeedDB) FindManyWithProjection(ctx context.Context, collection string, filter any, projection []string, opts db.FindManyOptions, result any) error {
	return nil
}

func (m *mockFeedDB) Distinct(ctx context.Context, collection string, field string, filter any, result any) error {
	return nil
}

func (m *mockFeedDB) Update(ctx context.Context, collection string, filter any, update any) error {
	if m.updateOneFunc != nil {
		return m.updateOneFunc(ctx, collection, filter, update)
	}
	return nil
}

func (m *mockFeedDB) UpdateOne(ctx context.Context, collection string, filter any, update any) error {
	return m.Update(ctx, collection, filter, update)
}

func (m *mockFeedDB) UpdateMany(ctx context.Context, collection string, filter any, update any) error {
	return nil
}

func (m *mockFeedDB) Upsert(ctx context.Context, collection string, filter any, document any) error {
	return nil
}

func (m *mockFeedDB) Inc(ctx context.Context, collection string, filter any, field string, value int64) error {
	return nil
}

func (m *mockFeedDB) AddToSet(ctx context.Context, collection string, filter any, field string, value any) error {
	return nil
}

func (m *mockFeedDB) Delete(ctx context.Context, collection string, filter any) (int64, error) {
	return 0, nil
}

func (m *mockFeedDB) DeleteOne(ctx context.Context, collection string, filter any) (int64, error) {
	return 0, nil
}

func (m *mockFeedDB) DeleteMany(ctx context.Context, collection string, filter any) error {
	return nil
}

func (m *mockFeedDB) FindOneAndUpdate(ctx context.Context, collection string, filter any, update any, result any) error {
	if m.findOneAndUpdateFunc != nil {
		return m.findOneAndUpdateFunc(ctx, collection, filter, update, result)
	}
	return nil
}

func (m *mockFeedDB) Aggregate(ctx context.Context, collection string, pipeline any, result any) error {
	if m.aggregateFunc != nil {
		return m.aggregateFunc(ctx, collection, pipeline, result)
	}
	return nil
}

func (m *mockFeedDB) Count(ctx context.Context, collection string, filter any) (int64, error) {
	return 0, nil
}

func (m *mockFeedDB) CountDocuments(ctx context.Context, collection string, filter any) (int64, error) {
	if m.countDocumentsFunc != nil {
		return m.countDocumentsFunc(ctx, collection, filter)
	}
	return 0, nil
}

func (m *mockFeedDB) EstimatedDocumentCount(ctx context.Context, collection string) (int64, error) {
	return 0, nil
}

type mockFeedCache struct {
	getFunc  func(ctx context.Context, key string) ([]byte, error)
	setFunc  func(ctx context.Context, key string, value []byte, ttl time.Duration) error
	hgetFunc func(ctx context.Context, key, field string) ([]byte, error)
}

func (m *mockFeedCache) Get(ctx context.Context, key string) ([]byte, error) {
	if m.getFunc != nil {
		return m.getFunc(ctx, key)
	}
	return nil, fmt.Errorf("not implemented")
}

func (m *mockFeedCache) Set(ctx context.Context, key string, value []byte, ttl time.Duration) error {
	if m.setFunc != nil {
		return m.setFunc(ctx, key, value, ttl)
	}
	return nil
}

func (m *mockFeedCache) SetNX(ctx context.Context, key string, value []byte, ttl time.Duration) (bool, error) {
	return false, nil
}

func (m *mockFeedCache) SetWithExpiry(ctx context.Context, key string, value []byte, ttl time.Duration) error {
	return nil
}

func (m *mockFeedCache) Exists(ctx context.Context, key string) (bool, error) {
	return false, nil
}

func (m *mockFeedCache) Del(ctx context.Context, key string) error {
	return nil
}

func (m *mockFeedCache) HSet(ctx context.Context, key, field string, value []byte) error {
	return nil
}

func (m *mockFeedCache) HGet(ctx context.Context, key, field string) ([]byte, error) {
	if m.hgetFunc != nil {
		return m.hgetFunc(ctx, key, field)
	}
	return nil, fmt.Errorf("not implemented")
}

func (m *mockFeedCache) HDel(ctx context.Context, key, field string) (bool, error) {
	return false, nil
}

func (m *mockFeedCache) Incr(ctx context.Context, key string) (int64, error) {
	return 0, nil
}

type mockFeedMQ struct {
	publishFunc func(ctx context.Context, subject string, data []byte) error
}

func (m *mockFeedMQ) Publish(ctx context.Context, subject string, data []byte) error {
	if m.publishFunc != nil {
		return m.publishFunc(ctx, subject, data)
	}
	return nil
}

func (m *mockFeedMQ) Ping(ctx context.Context) error {
	return nil
}

func (m *mockFeedMQ) Subscribe(ctx context.Context, subject string, handler mq.MessageHandler) (mq.Subscription, error) {
	return nil, nil
}

func (m *mockFeedMQ) QueueSubscribe(ctx context.Context, subject string, queue string, handler mq.MessageHandler) (mq.Subscription, error) {
	return nil, nil
}

func makeDeps(dbMock *mockFeedDB, cacheMock *mockFeedCache, mqMock *mockFeedMQ) *infra.Deps {
	return &infra.Deps{
		DB:    dbMock,
		Cache: cacheMock,
		MQ:    mqMock,
	}
}

func validToken(t *testing.T, userID, username string) string {
	claims := models.Claims{UserID: userID, Username: username}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(config.JwtSecret)
	if err != nil {
		t.Fatalf("failed to sign token: %v", err)
	}
	return fmt.Sprintf("Bearer %s", signed)
}

func TestGetPostHandler(t *testing.T) {
	mockDB := &mockFeedDB{}
	mockCache := &mockFeedCache{}
	mockMQ := &mockFeedMQ{}
	app := makeDeps(mockDB, mockCache, mockMQ)

	mockDB.findOneFunc = func(ctx context.Context, collection string, filter any, result any) error {
		post := result.(*models.FeedPost)
		*post = models.FeedPost{PostID: "post-1", UserID: "user-1", Text: "hello"}
		return nil
	}
	mockDB.countDocumentsFunc = func(ctx context.Context, collection string, filter any) (int64, error) {
		return 42, nil
	}
	mockDB.updateOneFunc = func(ctx context.Context, collection string, filter any, update any) error {
		return nil
	}
	mockCache.getFunc = func(ctx context.Context, key string) ([]byte, error) {
		return nil, fmt.Errorf("cache miss")
	}
	mockCache.setFunc = func(ctx context.Context, key string, value []byte, ttl time.Duration) error {
		return nil
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/feed/post/post-1", nil)
	rr := httptest.NewRecorder()

	GetPost(app)(rr, req, httprouter.Params{{Key: "postid", Value: "post-1"}})

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	var out models.FeedPost
	if err := json.NewDecoder(rr.Body).Decode(&out); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if out.PostID != "post-1" || out.Likes != 42 {
		t.Fatalf("unexpected response %+v", out)
	}
}

func TestGetPostsHandler(t *testing.T) {
	mockDB := &mockFeedDB{}
	mockCache := &mockFeedCache{}
	mockMQ := &mockFeedMQ{}
	app := makeDeps(mockDB, mockCache, mockMQ)

	mockDB.findManyWithOptionsFunc = func(ctx context.Context, collection string, filter any, opts db.FindManyOptions, result any) error {
		posts := result.(*[]models.FeedPost)
		*posts = []models.FeedPost{{PostID: "post-1", UserID: "user-1", Text: "hello"}}
		return nil
	}
	mockCache.hgetFunc = func(ctx context.Context, key, field string) ([]byte, error) {
		return []byte("alice"), nil
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/feed/posts", nil)
	rr := httptest.NewRecorder()

	GetPosts(app)(rr, req, nil)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	var resp struct {
		Ok   bool            `json:"ok"`
		Data json.RawMessage `json:"data"`
	}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !resp.Ok {
		t.Fatalf("expected ok true")
	}

	var posts []models.FeedPost
	if err := json.Unmarshal(resp.Data, &posts); err != nil {
		t.Fatalf("decode posts: %v", err)
	}
	if len(posts) != 1 || posts[0].Username != "alice" {
		t.Fatalf("unexpected posts %+v", posts)
	}
}

func TestCreateFeedPostHandler(t *testing.T) {
	mockDB := &mockFeedDB{}
	mockCache := &mockFeedCache{}
	mockMQ := &mockFeedMQ{}
	app := makeDeps(mockDB, mockCache, mockMQ)

	mockDB.insertOneFunc = func(ctx context.Context, collection string, document any) error {
		return nil
	}
	mockMQ.publishFunc = func(ctx context.Context, subject string, data []byte) error {
		return nil
	}

	body := `{"type":"text","text":"hello world"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/feed/post", bytes.NewBufferString(body))
	req.Header.Set("Authorization", validToken(t, "user-1", "alice"))
	rr := httptest.NewRecorder()

	CreateFeedPost(app)(rr, req, nil)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	var resp struct {
		Ok   bool            `json:"ok"`
		Data models.FeedPost `json:"data"`
	}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !resp.Ok || resp.Data.Text != "hello world" || resp.Data.UserID != "user-1" {
		t.Fatalf("unexpected response %+v", resp)
	}
}

func TestEditPostHandler(t *testing.T) {
	mockDB := &mockFeedDB{}
	mockCache := &mockFeedCache{}
	mockMQ := &mockFeedMQ{}
	app := makeDeps(mockDB, mockCache, mockMQ)

	mockDB.findOneAndUpdateFunc = func(ctx context.Context, collection string, filter any, update any, result any) error {
		post := result.(*models.FeedPost)
		*post = models.FeedPost{PostID: "post-1", UserID: "user-1", Text: "edited text"}
		return nil
	}
	mockMQ.publishFunc = func(ctx context.Context, subject string, data []byte) error {
		return nil
	}

	body := `{"text":"edited text"}`
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/feed/post/post-1", bytes.NewBufferString(body))
	req.Header.Set("Authorization", validToken(t, "user-1", "alice"))
	rr := httptest.NewRecorder()

	EditPost(app)(rr, req, httprouter.Params{{Key: "postid", Value: "post-1"}})

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	var resp struct {
		Ok   bool            `json:"ok"`
		Data models.FeedPost `json:"data"`
	}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !resp.Ok || resp.Data.Text != "edited text" {
		t.Fatalf("unexpected response %+v", resp)
	}
}

func TestGetPostsMetadataHandler(t *testing.T) {
	mockDB := &mockFeedDB{}
	mockCache := &mockFeedCache{}
	mockMQ := &mockFeedMQ{}
	app := makeDeps(mockDB, mockCache, mockMQ)

	mockDB.aggregateFunc = func(ctx context.Context, collection string, pipeline any, result any) error {
		switch collection {
		case likesCollection:
			out := result.(*[]struct {
				ID    string `bson:"_id"`
				Count int64  `bson:"count"`
			})
			*out = []struct {
				ID    string `bson:"_id"`
				Count int64  `bson:"count"`
			}{{ID: "post-1", Count: 5}}
			return nil
		case commentsCollection:
			out := result.(*[]struct {
				ID    string `bson:"_id"`
				Count int64  `bson:"count"`
			})
			*out = []struct {
				ID    string `bson:"_id"`
				Count int64  `bson:"count"`
			}{{ID: "post-1", Count: 2}}
			return nil
		default:
			return fmt.Errorf("unexpected aggregate collection %s", collection)
		}
	}
	mockDB.findManyFunc = func(ctx context.Context, collection string, filter any, result any, opts ...*options.FindOptions) error {
		likes := result.(*[]struct {
			PostID string `bson:"postid"`
		})
		*likes = []struct {
			PostID string `bson:"postid"`
		}{{PostID: "post-1"}}
		return nil
	}

	body := `{ "ids": ["post-1", "post-2"] }`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/feed/metadata", bytes.NewBufferString(body))
	req = req.WithContext(context.WithValue(req.Context(), "userId", "user-1"))
	rr := httptest.NewRecorder()

	GetPostsMetadata(app)(rr, req, nil)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	var resp []PostMetadata
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(resp) != 2 {
		t.Fatalf("expected 2 metadata items, got %d", len(resp))
	}
	if resp[0].PostID != "post-1" || resp[0].Likes != 5 || resp[0].Comments != 2 || !resp[0].LikedByUser {
		t.Fatalf("unexpected metadata: %+v", resp[0])
	}
}

func TestDeletePostHandler(t *testing.T) {
	mockDB := &mockFeedDB{}
	mockCache := &mockFeedCache{}
	mockMQ := &mockFeedMQ{}
	app := makeDeps(mockDB, mockCache, mockMQ)

	orig := deletePostFactory
	defer func() { deletePostFactory = orig }()
	deletePostFactory = func(app *infra.Deps) httprouter.Handle {
		return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
			w.WriteHeader(http.StatusOK)
		}
	}

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/feed/post/post-1", nil)
	rr := httptest.NewRecorder()

	DeletePost(app)(rr, req, httprouter.Params{{Key: "postid", Value: "post-1"}})
	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	req = httptest.NewRequest(http.MethodDelete, "/api/v1/feed/post/", nil)
	rr = httptest.NewRecorder()
	DeletePost(app)(rr, req, httprouter.Params{{Key: "postid", Value: ""}})
	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", rr.Code)
	}
}
