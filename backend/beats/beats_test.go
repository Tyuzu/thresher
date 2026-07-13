package beats

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"time"

	"naevis/config"
	"naevis/infra"
	"naevis/infra/cache"
	"naevis/infra/db"
	"naevis/infra/mq"
	"naevis/models"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type mockDatabase struct {
	findOneErr       error
	findOneResult    any
	findOneFunc      func(ctx context.Context, collection string, filter any, result any) error
	findManyFunc     func(ctx context.Context, collection string, filter any, result any, opts ...*options.FindOptions) error
	countDocuments   int64
	countErr         error
	countDocumentsFn func(ctx context.Context, collection string, filter any) (int64, error)
	insertFunc       func(ctx context.Context, collection string, document any) error
	upsertFunc       func(ctx context.Context, collection string, filter any, document any) error
	deleteOneFunc    func(ctx context.Context, collection string, filter any) (int64, error)
	updateOneFunc    func(ctx context.Context, collection string, filter any, update any) error
}

func (m *mockDatabase) Ping(context.Context) error { return nil }
func (m *mockDatabase) WithDB(ctx context.Context, op func(ctx context.Context) error) error {
	return op(ctx)
}
func (m *mockDatabase) RunTransaction(ctx context.Context, fn func(ctx context.Context) error) error {
	return fn(ctx)
}
func (m *mockDatabase) Insert(ctx context.Context, collection string, document any) error {
	if m.insertFunc != nil {
		return m.insertFunc(ctx, collection, document)
	}
	return nil
}
func (m *mockDatabase) InsertOne(ctx context.Context, collection string, document any) error {
	return m.Insert(ctx, collection, document)
}
func (m *mockDatabase) InsertMany(ctx context.Context, collection string, documents []any) error {
	return nil
}
func (m *mockDatabase) BulkWrite(ctx context.Context, collection string, operations []any) error {
	return nil
}
func (m *mockDatabase) FindOne(ctx context.Context, collection string, filter any, result any) error {
	if m.findOneFunc != nil {
		return m.findOneFunc(ctx, collection, filter, result)
	}
	if m.findOneErr != nil {
		return m.findOneErr
	}
	if m.findOneResult == nil {
		return nil
	}
	setValue(result, m.findOneResult)
	return nil
}
func (m *mockDatabase) FindOneWithProjection(context.Context, string, any, []string, any) error {
	return nil
}
func (m *mockDatabase) FindMany(ctx context.Context, collection string, filter any, result any, opts ...*options.FindOptions) error {
	if m.findManyFunc != nil {
		return m.findManyFunc(ctx, collection, filter, result, opts...)
	}
	return nil
}
func (m *mockDatabase) FindManyWithOptions(context.Context, string, any, db.FindManyOptions, any) error {
	return nil
}
func (m *mockDatabase) FindManyWithProjection(context.Context, string, any, []string, db.FindManyOptions, any) error {
	return nil
}
func (m *mockDatabase) Distinct(context.Context, string, string, any, any) error { return nil }
func (m *mockDatabase) Update(context.Context, string, any, any) error           { return nil }
func (m *mockDatabase) UpdateOne(ctx context.Context, collection string, filter any, update any) error {
	if m.updateOneFunc != nil {
		return m.updateOneFunc(ctx, collection, filter, update)
	}
	return nil
}
func (m *mockDatabase) UpdateMany(context.Context, string, any, any) error { return nil }
func (m *mockDatabase) Upsert(ctx context.Context, collection string, filter any, document any) error {
	if m.upsertFunc != nil {
		return m.upsertFunc(ctx, collection, filter, document)
	}
	return nil
}
func (m *mockDatabase) Inc(context.Context, string, any, string, int64) error    { return nil }
func (m *mockDatabase) AddToSet(context.Context, string, any, string, any) error { return nil }
func (m *mockDatabase) Delete(context.Context, string, any) (int64, error)       { return 0, nil }
func (m *mockDatabase) DeleteOne(ctx context.Context, collection string, filter any) (int64, error) {
	if m.deleteOneFunc != nil {
		return m.deleteOneFunc(ctx, collection, filter)
	}
	return 0, nil
}
func (m *mockDatabase) DeleteMany(context.Context, string, any) error                 { return nil }
func (m *mockDatabase) FindOneAndUpdate(context.Context, string, any, any, any) error { return nil }
func (m *mockDatabase) Aggregate(context.Context, string, any, any) error             { return nil }
func (m *mockDatabase) Count(context.Context, string, any) (int64, error)             { return 0, nil }
func (m *mockDatabase) CountDocuments(ctx context.Context, collection string, filter any) (int64, error) {
	if m.countDocumentsFn != nil {
		return m.countDocumentsFn(ctx, collection, filter)
	}
	return m.countDocuments, m.countErr
}
func (m *mockDatabase) EstimatedDocumentCount(context.Context, string) (int64, error) { return 0, nil }

type mockCache struct {
	getFunc  func(ctx context.Context, key string) ([]byte, error)
	setFunc  func(ctx context.Context, key string, value []byte, ttl time.Duration) error
	incrFunc func(ctx context.Context, key string) (int64, error)
}

func (m *mockCache) Get(ctx context.Context, key string) ([]byte, error) {
	if m.getFunc != nil {
		return m.getFunc(ctx, key)
	}
	return nil, nil
}
func (m *mockCache) Set(ctx context.Context, key string, value []byte, ttl time.Duration) error {
	if m.setFunc != nil {
		return m.setFunc(ctx, key, value, ttl)
	}
	return nil
}
func (m *mockCache) SetNX(context.Context, string, []byte, time.Duration) (bool, error) {
	return true, nil
}
func (m *mockCache) SetWithExpiry(context.Context, string, []byte, time.Duration) error { return nil }
func (m *mockCache) Exists(context.Context, string) (bool, error)                       { return false, nil }
func (m *mockCache) Del(context.Context, string) error                                  { return nil }
func (m *mockCache) HSet(context.Context, string, string, []byte) error                 { return nil }
func (m *mockCache) HGet(context.Context, string, string) ([]byte, error)               { return nil, nil }
func (m *mockCache) HDel(context.Context, string, string) (bool, error)                 { return false, nil }
func (m *mockCache) Incr(ctx context.Context, key string) (int64, error) {
	if m.incrFunc != nil {
		return m.incrFunc(ctx, key)
	}
	return 1, nil
}

var _ cache.Cache = (*mockCache)(nil)

type mockMQ struct{}

func (m *mockMQ) Publish(context.Context, string, []byte) error { return nil }
func (m *mockMQ) Ping(context.Context) error                    { return nil }
func (m *mockMQ) Subscribe(context.Context, string, mq.MessageHandler) (mq.Subscription, error) {
	return nil, nil
}
func (m *mockMQ) QueueSubscribe(context.Context, string, string, mq.MessageHandler) (mq.Subscription, error) {
	return nil, nil
}

var _ mq.MQ = (*mockMQ)(nil)

func setValue(dst any, src any) {
	rv := reflect.ValueOf(dst)
	if !rv.IsValid() || rv.Kind() != reflect.Ptr || rv.IsNil() {
		return
	}
	reflect.ValueOf(src).Type().AssignableTo(rv.Elem().Type())
	rv.Elem().Set(reflect.ValueOf(src))
}

func newTestApp(db *mockDatabase) *infra.Deps {
	return &infra.Deps{DB: db, Cache: &mockCache{}, MQ: &mockMQ{}}
}

func newRequestWithUser(userID string) *http.Request {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	return req.WithContext(context.WithValue(req.Context(), config.UserIDKey, userID))
}

func TestHandleFollowAction(t *testing.T) {
	tests := []struct {
		name          string
		action        string
		wantFollowing bool
		wantStatus    int
	}{
		{name: "follow", action: "follow", wantFollowing: true, wantStatus: http.StatusOK},
		{name: "unfollow", action: "unfollow", wantFollowing: false, wantStatus: http.StatusOK},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := newTestApp(&mockDatabase{})
			req := newRequestWithUser("user-1")
			rr := httptest.NewRecorder()
			ps := httprouter.Params{{Key: "id", Value: "target-user"}}

			HandleFollowAction(rr, req, ps, tt.action, app)

			if rr.Code != tt.wantStatus {
				t.Fatalf("expected status %d, got %d", tt.wantStatus, rr.Code)
			}

			var body map[string]any
			if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
				t.Fatalf("decode response: %v", err)
			}
			if body["isFollowing"] != tt.wantFollowing {
				t.Fatalf("expected isFollowing=%v, got %#v", tt.wantFollowing, body["isFollowing"])
			}
		})
	}
}

func TestUpdateFollowRelationship(t *testing.T) {
	db := &mockDatabase{}
	app := newTestApp(db)

	err := UpdateFollowRelationship(context.Background(), "user-a", "user-b", "follow", app)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestToggleLike(t *testing.T) {
	tests := []struct {
		name          string
		findOneErr    error
		deleteOneErr  error
		wantStatus    int
		wantLiked     bool
		wantBodyCount int64
	}{
		{name: "unauthorized", wantStatus: http.StatusUnauthorized},
		{name: "like", findOneErr: errors.New("not found"), wantStatus: http.StatusOK, wantLiked: true, wantBodyCount: 1},
		{name: "unlike", findOneErr: nil, wantStatus: http.StatusOK, wantLiked: false, wantBodyCount: 1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db := &mockDatabase{findOneErr: tt.findOneErr, deleteOneFunc: func(context.Context, string, any) (int64, error) { return 1, tt.deleteOneErr }}
			app := newTestApp(db)
			req := httptest.NewRequest(http.MethodPost, "/", nil)
			if tt.name != "unauthorized" {
				req = req.WithContext(context.WithValue(req.Context(), config.UserIDKey, "user-1"))
			}
			rr := httptest.NewRecorder()
			ps := httprouter.Params{{Key: "entitytype", Value: "beat"}, {Key: "entityid", Value: "beat-1"}}

			ToggleLike(app)(rr, req, ps)

			if rr.Code != tt.wantStatus {
				t.Fatalf("expected status %d, got %d", tt.wantStatus, rr.Code)
			}
			if tt.name == "unauthorized" {
				return
			}

			var body map[string]any
			if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
				t.Fatalf("decode response: %v", err)
			}
			if body["liked"] != tt.wantLiked {
				t.Fatalf("expected liked=%v, got %#v", tt.wantLiked, body["liked"])
			}
		})
	}
}

func TestBatchUserLikes(t *testing.T) {
	db := &mockDatabase{findManyFunc: func(ctx context.Context, collection string, filter any, result any, opts ...*options.FindOptions) error {
		if collection == likesCollection {
			setValue(result, []models.Like{{UserID: "user-1", EntityID: "beat-1"}})
		}
		return nil
	}}
	app := newTestApp(db)
	req := httptest.NewRequest(http.MethodPost, "/", io.NopCloser(strings.NewReader(`{"entity_ids":["beat-1","beat-2"]}`)))
	req = req.WithContext(context.WithValue(req.Context(), config.UserIDKey, "user-1"))
	rr := httptest.NewRecorder()

	BatchUserLikes(app)(rr, req, nil)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rr.Code)
	}
}

func TestGetLikersAndLikeCount(t *testing.T) {
	t.Run("get likers", func(t *testing.T) {
		db := &mockDatabase{findManyFunc: func(ctx context.Context, collection string, filter any, result any, opts ...*options.FindOptions) error {
			switch collection {
			case likesCollection:
				setValue(result, []models.Like{{UserID: "user-1", EntityID: "beat-1"}})
			case usersCollection:
				setValue(result, []struct {
					UserID   string `bson:"userid"`
					Username string `bson:"username"`
					Avatar   string `bson:"avatar,omitempty"`
				}{{UserID: "user-1", Username: "demo", Avatar: "avatar"}})
			}
			return nil
		}}
		app := newTestApp(db)
		req := newRequestWithUser("user-1")
		rr := httptest.NewRecorder()
		ps := httprouter.Params{{Key: "entitytype", Value: "beat"}, {Key: "entityid", Value: "beat-1"}}

		GetLikers(app)(rr, req, ps)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected status %d, got %d", http.StatusOK, rr.Code)
		}
	})

	t.Run("get like count", func(t *testing.T) {
		db := &mockDatabase{countDocumentsFn: func(context.Context, string, any) (int64, error) { return 2, nil }}
		app := newTestApp(db)
		req := newRequestWithUser("user-1")
		rr := httptest.NewRecorder()
		ps := httprouter.Params{{Key: "entitytype", Value: "beat"}, {Key: "entityid", Value: "beat-1"}}

		GetLikeCount(app)(rr, req, ps)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected status %d, got %d", http.StatusOK, rr.Code)
		}
	})
}

func TestFollowQueries(t *testing.T) {
	t.Run("does follow", func(t *testing.T) {
		db := &mockDatabase{countDocumentsFn: func(context.Context, string, any) (int64, error) { return 1, nil }}
		app := newTestApp(db)
		req := newRequestWithUser("user-1")
		rr := httptest.NewRecorder()
		ps := httprouter.Params{{Key: "id", Value: "target"}}

		DoesFollow(app)(rr, req, ps)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected status %d, got %d", http.StatusOK, rr.Code)
		}
	})

	t.Run("get followers", func(t *testing.T) {
		db := &mockDatabase{findOneFunc: func(ctx context.Context, collection string, filter any, result any) error {
			setValue(result, models.UserFollow{UserID: "user-1", Followers: []string{"user-2"}})
			return nil
		}, findManyFunc: func(ctx context.Context, collection string, filter any, result any, opts ...*options.FindOptions) error {
			setValue(result, []models.User{{UserID: "user-2", Username: "demo"}})
			return nil
		}}
		app := newTestApp(db)
		req := newRequestWithUser("user-1")
		rr := httptest.NewRecorder()
		GetFollowers(app)(rr, req, nil)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected status %d, got %d", http.StatusOK, rr.Code)
		}
	})

	t.Run("get following", func(t *testing.T) {
		db := &mockDatabase{findOneFunc: func(ctx context.Context, collection string, filter any, result any) error {
			setValue(result, models.UserFollow{UserID: "user-1", Follows: []string{"user-2"}})
			return nil
		}, findManyFunc: func(ctx context.Context, collection string, filter any, result any, opts ...*options.FindOptions) error {
			setValue(result, []models.User{{UserID: "user-2", Username: "demo"}})
			return nil
		}}
		app := newTestApp(db)
		req := newRequestWithUser("user-1")
		rr := httptest.NewRecorder()
		GetFollowing(app)(rr, req, nil)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected status %d, got %d", http.StatusOK, rr.Code)
		}
	})
}

func TestSubscriptionHandlers(t *testing.T) {
	t.Run("does subscribe", func(t *testing.T) {
		db := &mockDatabase{countDocumentsFn: func(context.Context, string, any) (int64, error) { return 1, nil }}
		app := newTestApp(db)
		req := newRequestWithUser("user-1")
		rr := httptest.NewRecorder()
		ps := httprouter.Params{{Key: "id", Value: "entity-1"}, {Key: "type", Value: "user"}}

		DoesSubscribeEntity(app)(rr, req, ps)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected status %d, got %d", http.StatusOK, rr.Code)
		}
	})

	t.Run("get subscribers", func(t *testing.T) {
		db := &mockDatabase{findOneFunc: func(ctx context.Context, collection string, filter any, result any) error {
			setValue(result, models.UserSubscribe{UserID: "entity-1", Subscribers: []string{"user-1"}})
			return nil
		}, findManyFunc: func(ctx context.Context, collection string, filter any, result any, opts ...*options.FindOptions) error {
			setValue(result, []models.User{{UserID: "user-1", Username: "demo"}})
			return nil
		}}
		app := newTestApp(db)
		req := newRequestWithUser("user-1")
		rr := httptest.NewRecorder()
		ps := httprouter.Params{{Key: "id", Value: "entity-1"}}

		GetSubscribers(app)(rr, req, ps)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected status %d, got %d", http.StatusOK, rr.Code)
		}
	})

	t.Run("handle entity subscription", func(t *testing.T) {
		db := &mockDatabase{}
		app := newTestApp(db)
		req := newRequestWithUser("user-1")
		rr := httptest.NewRecorder()
		ps := httprouter.Params{{Key: "id", Value: "entity-1"}}

		HandleEntitySubscription(rr, req, ps, "user", "subscribe", app)
		if rr.Code != http.StatusOK {
			t.Fatalf("expected status %d, got %d", http.StatusOK, rr.Code)
		}
	})
}
