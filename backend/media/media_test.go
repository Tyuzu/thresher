package media

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"naevis/config"
	"naevis/infra"
	"naevis/infra/db"
	"naevis/infra/mq"
	"naevis/models"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type mediaTestDB struct {
	media    models.Media
	medias   []models.Media
	inserted []any
	findErr  error
}

func (m *mediaTestDB) Ping(ctx context.Context) error { return nil }
func (m *mediaTestDB) WithDB(ctx context.Context, op func(ctx context.Context) error) error {
	return op(ctx)
}
func (m *mediaTestDB) RunTransaction(ctx context.Context, fn func(ctx context.Context) error) error {
	return fn(ctx)
}
func (m *mediaTestDB) Insert(ctx context.Context, collection string, document any) error {
	m.inserted = append(m.inserted, document)
	return nil
}
func (m *mediaTestDB) InsertOne(ctx context.Context, collection string, document any) error {
	m.inserted = append(m.inserted, document)
	return nil
}
func (m *mediaTestDB) InsertMany(ctx context.Context, collection string, documents []any) error {
	return nil
}
func (m *mediaTestDB) BulkWrite(ctx context.Context, collection string, operations []any) error {
	return nil
}
func (m *mediaTestDB) FindOne(ctx context.Context, collection string, filter any, result any) error {
	if m.findErr != nil {
		return m.findErr
	}
	if result == nil {
		return nil
	}
	mediaPtr, ok := result.(*models.Media)
	if !ok {
		return nil
	}
	*mediaPtr = m.media
	return nil
}
func (m *mediaTestDB) FindOneWithProjection(ctx context.Context, collection string, filter any, projection []string, result any) error {
	return m.FindOne(ctx, collection, filter, result)
}
func (m *mediaTestDB) FindMany(ctx context.Context, collection string, filter any, result any, opts ...*options.FindOptions) error {
	mediaSlice, ok := result.(*[]models.Media)
	if !ok {
		return nil
	}
	*mediaSlice = append([]models.Media(nil), m.medias...)
	return nil
}
func (m *mediaTestDB) FindManyWithOptions(ctx context.Context, collection string, filter any, opts db.FindManyOptions, result any) error {
	return m.FindMany(ctx, collection, filter, result)
}
func (m *mediaTestDB) FindManyWithProjection(ctx context.Context, collection string, filter any, projection []string, opts db.FindManyOptions, result any) error {
	return m.FindMany(ctx, collection, filter, result)
}
func (m *mediaTestDB) Distinct(ctx context.Context, collection string, field string, filter any, result any) error {
	return nil
}
func (m *mediaTestDB) Update(ctx context.Context, collection string, filter any, update any) error {
	return nil
}
func (m *mediaTestDB) UpdateOne(ctx context.Context, collection string, filter any, update any) error {
	return nil
}
func (m *mediaTestDB) UpdateMany(ctx context.Context, collection string, filter any, update any) error {
	return nil
}
func (m *mediaTestDB) Upsert(ctx context.Context, collection string, filter any, document any) error {
	return nil
}
func (m *mediaTestDB) Inc(ctx context.Context, collection string, filter any, field string, value int64) error {
	return nil
}
func (m *mediaTestDB) AddToSet(ctx context.Context, collection string, filter any, field string, value any) error {
	return nil
}
func (m *mediaTestDB) Delete(ctx context.Context, collection string, filter any) (int64, error) {
	return 0, nil
}
func (m *mediaTestDB) DeleteOne(ctx context.Context, collection string, filter any) (int64, error) {
	return 0, nil
}
func (m *mediaTestDB) DeleteMany(ctx context.Context, collection string, filter any) error {
	return nil
}
func (m *mediaTestDB) FindOneAndUpdate(ctx context.Context, collection string, filter any, update any, result any) error {
	return nil
}
func (m *mediaTestDB) Aggregate(ctx context.Context, collection string, pipeline any, result any) error {
	return nil
}
func (m *mediaTestDB) Count(ctx context.Context, collection string, filter any) (int64, error) {
	return 0, nil
}
func (m *mediaTestDB) CountDocuments(ctx context.Context, collection string, filter any) (int64, error) {
	return 0, nil
}
func (m *mediaTestDB) EstimatedDocumentCount(ctx context.Context, collection string) (int64, error) {
	return 0, nil
}

type mediaTestMQ struct{}

func (m *mediaTestMQ) Publish(ctx context.Context, subject string, data []byte) error { return nil }
func (m *mediaTestMQ) Ping(ctx context.Context) error                                 { return nil }
func (m *mediaTestMQ) Subscribe(ctx context.Context, subject string, handler mq.MessageHandler) (mq.Subscription, error) {
	return nil, nil
}
func (m *mediaTestMQ) QueueSubscribe(ctx context.Context, subject string, queue string, handler mq.MessageHandler) (mq.Subscription, error) {
	return nil, nil
}

func newMediaTestApp(db *mediaTestDB) *infra.Deps {
	return &infra.Deps{DB: db, MQ: &mediaTestMQ{}}
}

func TestMediaHandlers(t *testing.T) {
	tests := []struct {
		name string
		run  func(t *testing.T)
	}{
		{
			name: "add media",
			run: func(t *testing.T) {
				db := &mediaTestDB{}
				app := newMediaTestApp(db)
				body := bytes.NewBufferString(`{"caption":"hello","files":[{"filename":"photo.png","extn":".png"}]}`)
				req := httptest.NewRequest(http.MethodPost, "/media", body)
				req = req.WithContext(context.WithValue(req.Context(), config.UserIDKey, "user-1"))
				rec := httptest.NewRecorder()

				AddMedia(app)(rec, req, httprouter.Params{{Key: "entitytype", Value: "event"}, {Key: "entityid", Value: "event-1"}})

				if rec.Code != http.StatusOK {
					t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
				}
				var result []models.Media
				if err := json.Unmarshal(rec.Body.Bytes(), &result); err != nil {
					t.Fatalf("decode response: %v", err)
				}
				if len(result) != 1 {
					t.Fatalf("expected one inserted media, got %d", len(result))
				}
				if len(db.inserted) < 2 {
					t.Fatalf("expected media and userdata inserts, got %d", len(db.inserted))
				}
			},
		},
		{
			name: "edit media",
			run: func(t *testing.T) {
				db := &mediaTestDB{media: models.Media{MediaID: "m-1", MediaGroupID: "g-1", CreatorID: "user-1"}}
				app := newMediaTestApp(db)
				body := bytes.NewBufferString(`{"caption":"updated"}`)
				req := httptest.NewRequest(http.MethodPut, "/media", body)
				req = req.WithContext(context.WithValue(req.Context(), config.UserIDKey, "user-1"))
				rec := httptest.NewRecorder()

				EditMedia(app)(rec, req, httprouter.Params{{Key: "entitytype", Value: "event"}, {Key: "entityid", Value: "event-1"}, {Key: "id", Value: "m-1"}})

				if rec.Code != http.StatusOK {
					t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
				}
			},
		},
		{
			name: "get media",
			run: func(t *testing.T) {
				db := &mediaTestDB{media: models.Media{MediaID: "m-1", EntityID: "event-1", EntityType: "event"}}
				app := newMediaTestApp(db)
				req := httptest.NewRequest(http.MethodGet, "/media/m-1", nil)
				rec := httptest.NewRecorder()

				GetMedia(app)(rec, req, httprouter.Params{{Key: "entitytype", Value: "event"}, {Key: "entityid", Value: "event-1"}, {Key: "id", Value: "m-1"}})

				if rec.Code != http.StatusOK {
					t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
				}
				var result models.Media
				if err := json.Unmarshal(rec.Body.Bytes(), &result); err != nil {
					t.Fatalf("decode response: %v", err)
				}
				if result.MediaID != "m-1" {
					t.Fatalf("expected media id m-1, got %s", result.MediaID)
				}
			},
		},
		{
			name: "get medias",
			run: func(t *testing.T) {
				db := &mediaTestDB{medias: []models.Media{{MediaID: "m-1"}, {MediaID: "m-2"}}}
				app := newMediaTestApp(db)
				req := httptest.NewRequest(http.MethodGet, "/media", nil)
				rec := httptest.NewRecorder()

				GetMedias(app)(rec, req, httprouter.Params{{Key: "entitytype", Value: "event"}, {Key: "entityid", Value: "event-1"}})

				if rec.Code != http.StatusOK {
					t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
				}
				var result []models.Media
				if err := json.Unmarshal(rec.Body.Bytes(), &result); err != nil {
					t.Fatalf("decode response: %v", err)
				}
				if len(result) != 2 {
					t.Fatalf("expected two medias, got %d", len(result))
				}
			},
		},
		{
			name: "get media groups",
			run: func(t *testing.T) {
				db := &mediaTestDB{medias: []models.Media{{MediaID: "m-1", MediaGroupID: "g-1"}, {MediaID: "m-2", MediaGroupID: "g-1"}, {MediaID: "m-3", MediaGroupID: "g-2"}}}
				app := newMediaTestApp(db)
				req := httptest.NewRequest(http.MethodGet, "/media/groups", nil)
				rec := httptest.NewRecorder()

				GetMediaGroups(app)(rec, req, httprouter.Params{{Key: "entitytype", Value: "event"}, {Key: "entityid", Value: "event-1"}})

				if rec.Code != http.StatusOK {
					t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
				}
				var result []map[string]any
				if err := json.Unmarshal(rec.Body.Bytes(), &result); err != nil {
					t.Fatalf("decode response: %v", err)
				}
				if len(result) != 2 {
					t.Fatalf("expected two groups, got %d", len(result))
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, tt.run)
	}
}
