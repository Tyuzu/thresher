package booking

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/julienschmidt/httprouter"

	"naevis/infra"
	"naevis/infra/db"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// mockDB implements minimal Database methods used by booking handlers.
type mockDB struct {
	// allow injecting behavior per test
	FindOneFn          func(ctx context.Context, collection string, filter any, result any) error
	FindManyFn         func(ctx context.Context, collection string, filter any, result any, opts ...*options.FindOptions) error
	InsertOneFn        func(ctx context.Context, collection string, document any) error
	CountDocumentsFn   func(ctx context.Context, collection string, filter any) (int64, error)
	FindOneAndUpdateFn func(ctx context.Context, collection string, filter any, update any, result any) error
	UpdateOneFn        func(ctx context.Context, collection string, filter any, update any) error
	DeleteOneFn        func(ctx context.Context, collection string, filter any) (int64, error)
	DeleteManyFn       func(ctx context.Context, collection string, filter any) error
	InsertManyFn       func(ctx context.Context, collection string, documents []any) error
}

func (m *mockDB) Ping(ctx context.Context) error { return nil }
func (m *mockDB) WithDB(ctx context.Context, op func(ctx context.Context) error) error {
	return op(ctx)
}
func (m *mockDB) RunTransaction(ctx context.Context, fn func(ctx context.Context) error) error {
	return fn(ctx)
}
func (m *mockDB) Insert(ctx context.Context, collection string, document any) error { return nil }
func (m *mockDB) InsertOne(ctx context.Context, collection string, document any) error {
	if m.InsertOneFn != nil {
		return m.InsertOneFn(ctx, collection, document)
	}
	return nil
}
func (m *mockDB) InsertMany(ctx context.Context, collection string, documents []any) error {
	if m.InsertManyFn != nil {
		return m.InsertManyFn(ctx, collection, documents)
	}
	return nil
}
func (m *mockDB) BulkWrite(ctx context.Context, collection string, operations []any) error {
	return nil
}
func (m *mockDB) FindOne(ctx context.Context, collection string, filter any, result any) error {
	if m.FindOneFn != nil {
		return m.FindOneFn(ctx, collection, filter, result)
	}
	return nil
}
func (m *mockDB) FindOneWithProjection(ctx context.Context, collection string, filter any, projection []string, result any) error {
	return nil
}
func (m *mockDB) FindMany(ctx context.Context, collection string, filter any, result any, opts ...*options.FindOptions) error {
	if m.FindManyFn != nil {
		return m.FindManyFn(ctx, collection, filter, result, opts...)
	}
	return nil
}
func (m *mockDB) FindManyWithOptions(ctx context.Context, collection string, filter any, opts db.FindManyOptions, result any) error {
	return nil
}
func (m *mockDB) FindManyWithProjection(ctx context.Context, collection string, filter any, projection []string, opts db.FindManyOptions, result any) error {
	return nil
}
func (m *mockDB) Distinct(ctx context.Context, collection string, field string, filter any, result any) error {
	return nil
}
func (m *mockDB) Update(ctx context.Context, collection string, filter any, update any) error {
	return nil
}
func (m *mockDB) UpdateOne(ctx context.Context, collection string, filter any, update any) error {
	if m.UpdateOneFn != nil {
		return m.UpdateOneFn(ctx, collection, filter, update)
	}
	return nil
}
func (m *mockDB) UpdateMany(ctx context.Context, collection string, filter any, update any) error {
	return nil
}
func (m *mockDB) Upsert(ctx context.Context, collection string, filter any, document any) error {
	return nil
}
func (m *mockDB) Inc(ctx context.Context, collection string, filter any, field string, value int64) error {
	return nil
}
func (m *mockDB) AddToSet(ctx context.Context, collection string, filter any, field string, value any) error {
	return nil
}
func (m *mockDB) Delete(ctx context.Context, collection string, filter any) (int64, error) {
	return 0, nil
}
func (m *mockDB) DeleteOne(ctx context.Context, collection string, filter any) (int64, error) {
	if m.DeleteOneFn != nil {
		return m.DeleteOneFn(ctx, collection, filter)
	}
	return 1, nil
}
func (m *mockDB) DeleteMany(ctx context.Context, collection string, filter any) error {
	if m.DeleteManyFn != nil {
		return m.DeleteManyFn(ctx, collection, filter)
	}
	return nil
}
func (m *mockDB) FindOneAndUpdate(ctx context.Context, collection string, filter any, update any, result any) error {
	if m.FindOneAndUpdateFn != nil {
		return m.FindOneAndUpdateFn(ctx, collection, filter, update, result)
	}
	return nil
}
func (m *mockDB) Aggregate(ctx context.Context, collection string, pipeline any, result any) error {
	return nil
}
func (m *mockDB) Count(ctx context.Context, collection string, filter any) (int64, error) {
	return 0, nil
}
func (m *mockDB) CountDocuments(ctx context.Context, collection string, filter any) (int64, error) {
	if m.CountDocumentsFn != nil {
		return m.CountDocumentsFn(ctx, collection, filter)
	}
	return 0, nil
}
func (m *mockDB) EstimatedDocumentCount(ctx context.Context, collection string) (int64, error) {
	return 0, nil
}

func makeDeps(dbImpl db.Database) *infra.Deps {
	return &infra.Deps{DB: dbImpl}
}

func TestCreateBookingHandler_TableDriven(t *testing.T) {
	_ = time.Now().Unix()
	tests := []struct {
		name         string
		payload      any
		setupMock    func(m *mockDB)
		wantStatus   int
		wantContains string
	}{
		{
			name:         "missing fields",
			payload:      map[string]any{"userId": "u1"},
			setupMock:    func(m *mockDB) {},
			wantStatus:   http.StatusBadRequest,
			wantContains: "missing fields",
		},
		{
			name:    "slot missing",
			payload: map[string]any{"userId": "u1", "entityType": "x", "entityId": "e1", "date": "2023-01-01", "start": "10:00", "slotId": "s1"},
			setupMock: func(m *mockDB) {
				m.FindOneFn = func(ctx context.Context, collection string, filter any, result any) error {
					return mongo.ErrNoDocuments
				}
			},
			wantStatus:   http.StatusOK,
			wantContains: "slot-missing",
		},
		{
			name:    "successful insert",
			payload: map[string]any{"userId": "u1", "entityType": "e", "entityId": "e1", "date": "2023-01-01", "start": "10:00"},
			setupMock: func(m *mockDB) {
				m.CountDocumentsFn = func(ctx context.Context, collection string, filter any) (int64, error) { return 0, nil }
				m.InsertOneFn = func(ctx context.Context, collection string, document any) error { return nil }
			},
			wantStatus:   http.StatusOK,
			wantContains: "ok",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mdb := &mockDB{}
			if tt.setupMock != nil {
				tt.setupMock(mdb)
			}

			deps := makeDeps(mdb)

			body, _ := json.Marshal(tt.payload)
			req := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(body))
			w := httptest.NewRecorder()

			handler := CreateBooking(deps)
			handler(w, req, nil)

			res := w.Result()
			if res.StatusCode != tt.wantStatus {
				t.Fatalf("status: got %d want %d", res.StatusCode, tt.wantStatus)
			}

			var b bytes.Buffer
			_, _ = b.ReadFrom(res.Body)
			if !bytes.Contains(b.Bytes(), []byte(tt.wantContains)) {
				t.Fatalf("response does not contain %q: %s", tt.wantContains, b.String())
			}
		})
	}
}

func TestUpdateCancelBooking_TableDriven(t *testing.T) {
	tests := []struct {
		name       string
		method     string
		path       string
		payload    any
		setupMock  func(m *mockDB)
		wantStatus int
	}{
		{
			name:       "update missing id",
			method:     http.MethodPost,
			path:       "/bookings/",
			payload:    map[string]any{"status": "confirmed"},
			setupMock:  nil,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:    "update not found",
			method:  http.MethodPost,
			path:    "/bookings/123",
			payload: map[string]any{"status": "confirmed"},
			setupMock: func(m *mockDB) {
				m.FindOneAndUpdateFn = func(ctx context.Context, collection string, filter any, update any, result any) error {
					return mongo.ErrNoDocuments
				}
			},
			wantStatus: http.StatusNotFound,
		},
		{
			name:    "cancel success",
			method:  http.MethodPost,
			path:    "/bookings/123/cancel",
			payload: nil,
			setupMock: func(m *mockDB) {
				m.FindOneAndUpdateFn = func(ctx context.Context, collection string, filter any, update any, result any) error { return nil }
			},
			wantStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mdb := &mockDB{}
			if tt.setupMock != nil {
				tt.setupMock(mdb)
			}
			deps := makeDeps(mdb)

			var body []byte
			if tt.payload != nil {
				body, _ = json.Marshal(tt.payload)
			}

			req := httptest.NewRequest(tt.method, tt.path, bytes.NewReader(body))
			w := httptest.NewRecorder()

			// If test path does not include an id param, call handler directly
			if tt.path == "/bookings/" {
				h := UpdateBookingStatus(deps)
				h(w, req, nil)
			} else {
				router := httprouter.New()
				if tt.name == "cancel success" {
					router.POST("/bookings/:id/cancel", CancelBooking(deps))
				} else {
					router.POST("/bookings/:id", UpdateBookingStatus(deps))
				}
				router.ServeHTTP(w, req)
			}
			res := w.Result()
			if res.StatusCode != tt.wantStatus {
				t.Fatalf("status: got %d want %d", res.StatusCode, tt.wantStatus)
			}
		})
	}
}
