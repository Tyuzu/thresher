package farms

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"naevis/config"
	"naevis/infra"
	"naevis/infra/db"
	"naevis/models"
)

type mockDB struct {
	FindOneFn   func(ctx context.Context, collection string, filter any, result any) error
	InsertOneFn func(ctx context.Context, collection string, document any) error
	UpdateOneFn func(ctx context.Context, collection string, filter any, update any) error
	DeleteOneFn func(ctx context.Context, collection string, filter any) (int64, error)
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
func (m *mockDB) DeleteMany(ctx context.Context, collection string, filter any) error { return nil }
func (m *mockDB) FindOneAndUpdate(ctx context.Context, collection string, filter any, update any, result any) error {
	return nil
}
func (m *mockDB) Aggregate(ctx context.Context, collection string, pipeline any, result any) error {
	return nil
}
func (m *mockDB) Count(ctx context.Context, collection string, filter any) (int64, error) {
	return 0, nil
}
func (m *mockDB) CountDocuments(ctx context.Context, collection string, filter any) (int64, error) {
	return 0, nil
}
func (m *mockDB) EstimatedDocumentCount(ctx context.Context, collection string) (int64, error) {
	return 0, nil
}

func makeFormBody(t *testing.T, fields map[string]string) (io.Reader, string) {
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	for key, value := range fields {
		if err := writer.WriteField(key, value); err != nil {
			t.Fatal(err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	return &buf, writer.FormDataContentType()
}

type farmTestCase struct {
	name            string
	handler         func(*infra.Deps) httprouter.Handle
	method          string
	url             string
	params          httprouter.Params
	body            func(t *testing.T) (io.Reader, string)
	userID          string
	setup           func(*mockDB)
	wantStatus      int
	wantBodyContain string
}

func TestFarmHandlers(t *testing.T) {
	tests := []farmTestCase{
		{
			name:    "CreateFarm success",
			handler: CreateFarm,
			method:  http.MethodPost,
			url:     "/farms",
			userID:  "user-1",
			body: func(t *testing.T) (io.Reader, string) {
				return makeFormBody(t, map[string]string{
					"name":               "Sunny Acres",
					"location":           "Nairobi",
					"description":        "A farm",
					"owner":              "Jane Doe",
					"contact":            "jane@example.com",
					"availabilityTiming": "8am - 5pm",
				})
			},
			setup: func(m *mockDB) {
				m.InsertOneFn = func(ctx context.Context, collection string, document any) error {
					if collection == farmsCollection {
						farm, ok := document.(models.Farm)
						if !ok {
							t.Fatalf("expected models.Farm, got %T", document)
						}
						if farm.Name != "Sunny Acres" || farm.CreatedBy != "user-1" {
							t.Fatalf("unexpected farm data %+v", farm)
						}
					}
					return nil
				}
			},
			wantStatus:      http.StatusOK,
			wantBodyContain: "success",
		},
		{
			name:    "CreateFarm missing required fields",
			handler: CreateFarm,
			method:  http.MethodPost,
			url:     "/farms",
			userID:  "user-1",
			body: func(t *testing.T) (io.Reader, string) {
				return makeFormBody(t, map[string]string{
					"location": "Nairobi",
					"owner":    "Jane Doe",
					"contact":  "jane@example.com",
				})
			},
			wantStatus:      http.StatusBadRequest,
			wantBodyContain: "Missing required fields",
		},
		{
			name:    "EditFarm success",
			handler: EditFarm,
			method:  http.MethodPut,
			url:     "/farms/farm-1",
			params:  httprouter.Params{{Key: "id", Value: "farm-1"}},
			userID:  "user-1",
			body: func(t *testing.T) (io.Reader, string) {
				body, _ := json.Marshal(map[string]string{"name": "Updated Farm"})
				return bytes.NewReader(body), "application/json"
			},
			setup: func(m *mockDB) {
				m.FindOneFn = func(ctx context.Context, collection string, filter any, result any) error {
					if collection != farmsCollection {
						t.Errorf("expected farms collection, got %s", collection)
					}
					if bm, ok := filter.(bson.M); !ok || bm["farmid"] != "farm-1" {
						t.Fatalf("unexpected filter %#v", filter)
					}
					f := result.(*models.Farm)
					*f = models.Farm{FarmID: "farm-1", CreatedBy: "user-1"}
					return nil
				}
				m.UpdateOneFn = func(ctx context.Context, collection string, filter any, update any) error {
					if collection != farmsCollection {
						t.Errorf("expected farms collection, got %s", collection)
					}
					return nil
				}
			},
			wantStatus:      http.StatusOK,
			wantBodyContain: "Farm updated",
		},
		{
			name:    "EditFarm missing fields",
			handler: EditFarm,
			method:  http.MethodPut,
			url:     "/farms/farm-1",
			params:  httprouter.Params{{Key: "id", Value: "farm-1"}},
			userID:  "user-1",
			body: func(t *testing.T) (io.Reader, string) {
				body, _ := json.Marshal(map[string]string{})
				return bytes.NewReader(body), "application/json"
			},
			setup: func(m *mockDB) {
				m.FindOneFn = func(ctx context.Context, collection string, filter any, result any) error {
					f := result.(*models.Farm)
					*f = models.Farm{FarmID: "farm-1", CreatedBy: "user-1"}
					return nil
				}
			},
			wantStatus:      http.StatusBadRequest,
			wantBodyContain: "No fields to update",
		},
		{
			name:    "EditFarm not found",
			handler: EditFarm,
			method:  http.MethodPut,
			url:     "/farms/farm-1",
			params:  httprouter.Params{{Key: "id", Value: "farm-1"}},
			userID:  "user-1",
			body: func(t *testing.T) (io.Reader, string) {
				body, _ := json.Marshal(map[string]string{"name": "Updated Farm"})
				return bytes.NewReader(body), "application/json"
			},
			setup: func(m *mockDB) {
				m.FindOneFn = func(ctx context.Context, collection string, filter any, result any) error {
					return mongo.ErrNoDocuments
				}
			},
			wantStatus:      http.StatusNotFound,
			wantBodyContain: "Farm not found",
		},
		{
			name:    "DeleteFarm success",
			handler: DeleteFarm,
			method:  http.MethodDelete,
			url:     "/farms/farm-1",
			params:  httprouter.Params{{Key: "id", Value: "farm-1"}},
			userID:  "user-1",
			setup: func(m *mockDB) {
				m.DeleteOneFn = func(ctx context.Context, collection string, filter any) (int64, error) {
					if collection != farmsCollection {
						t.Errorf("expected farms collection, got %s", collection)
					}
					return 1, nil
				}
			},
			wantStatus:      http.StatusOK,
			wantBodyContain: "success",
		},
		{
			name:            "DeleteFarm invalid user",
			handler:         DeleteFarm,
			method:          http.MethodDelete,
			url:             "/farms/farm-1",
			params:          httprouter.Params{{Key: "id", Value: "farm-1"}},
			wantStatus:      http.StatusBadRequest,
			wantBodyContain: "Invalid user",
		},
		{
			name:    "DeleteFarm error",
			handler: DeleteFarm,
			method:  http.MethodDelete,
			url:     "/farms/farm-1",
			params:  httprouter.Params{{Key: "id", Value: "farm-1"}},
			userID:  "user-1",
			setup: func(m *mockDB) {
				m.DeleteOneFn = func(ctx context.Context, collection string, filter any) (int64, error) {
					return 0, errors.New("db failure")
				}
			},
			wantStatus:      http.StatusInternalServerError,
			wantBodyContain: "success",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mdb := &mockDB{}
			if tt.setup != nil {
				tt.setup(mdb)
			}
			app := &infra.Deps{DB: mdb}

			var body io.Reader
			var contentType string
			if tt.body != nil {
				body, contentType = tt.body(t)
			}

			req := httptest.NewRequest(tt.method, tt.url, body)
			if contentType != "" {
				req.Header.Set("Content-Type", contentType)
			}
			if tt.userID != "" {
				req = req.WithContext(context.WithValue(req.Context(), config.UserIDKey, tt.userID))
			}

			rec := httptest.NewRecorder()
			tt.handler(app)(rec, req, tt.params)

			if rec.Code != tt.wantStatus {
				t.Fatalf("expected status %d, got %d body=%s", tt.wantStatus, rec.Code, rec.Body.String())
			}
			if tt.wantBodyContain != "" && !strings.Contains(rec.Body.String(), tt.wantBodyContain) {
				t.Fatalf("expected response body to contain %q, got %s", tt.wantBodyContain, rec.Body.String())
			}
		})
	}
}
