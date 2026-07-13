package baito

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	"naevis/config"
	"naevis/infra"
	"naevis/infra/db"
	"naevis/infra/mq"
	"naevis/models"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type mockDatabase struct {
	insertFunc              func(ctx context.Context, collection string, document any) error
	findOneFunc             func(ctx context.Context, collection string, filter any, result any) error
	findManyFunc            func(ctx context.Context, collection string, filter any, result any, opts ...*options.FindOptions) error
	findManyWithOptionsFunc func(ctx context.Context, collection string, filter any, opts db.FindManyOptions, result any) error
	updateOneFunc           func(ctx context.Context, collection string, filter any, update any) error
	incFunc                 func(ctx context.Context, collection string, filter any, field string, value int64) error
	addToSetFunc            func(ctx context.Context, collection string, filter any, field string, value any) error
	deleteOneFunc           func(ctx context.Context, collection string, filter any) (int64, error)
	countDocumentsFunc      func(ctx context.Context, collection string, filter any) (int64, error)
	aggregateFunc           func(ctx context.Context, collection string, pipeline any, result any) error
}

func (m *mockDatabase) Ping(ctx context.Context) error { return nil }
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
	return nil
}
func (m *mockDatabase) FindOneWithProjection(ctx context.Context, collection string, filter any, projection []string, result any) error {
	return m.FindOne(ctx, collection, filter, result)
}
func (m *mockDatabase) FindMany(ctx context.Context, collection string, filter any, result any, opts ...*options.FindOptions) error {
	if m.findManyFunc != nil {
		return m.findManyFunc(ctx, collection, filter, result, opts...)
	}
	return nil
}
func (m *mockDatabase) FindManyWithOptions(ctx context.Context, collection string, filter any, opts db.FindManyOptions, result any) error {
	if m.findManyWithOptionsFunc != nil {
		return m.findManyWithOptionsFunc(ctx, collection, filter, opts, result)
	}
	return nil
}
func (m *mockDatabase) FindManyWithProjection(ctx context.Context, collection string, filter any, projection []string, opts db.FindManyOptions, result any) error {
	return m.FindManyWithOptions(ctx, collection, filter, opts, result)
}
func (m *mockDatabase) Distinct(ctx context.Context, collection string, field string, filter any, result any) error {
	return nil
}
func (m *mockDatabase) Update(ctx context.Context, collection string, filter any, update any) error {
	return nil
}
func (m *mockDatabase) UpdateOne(ctx context.Context, collection string, filter any, update any) error {
	if m.updateOneFunc != nil {
		return m.updateOneFunc(ctx, collection, filter, update)
	}
	return nil
}
func (m *mockDatabase) UpdateMany(ctx context.Context, collection string, filter any, update any) error {
	return nil
}
func (m *mockDatabase) Upsert(ctx context.Context, collection string, filter any, document any) error {
	return nil
}
func (m *mockDatabase) Inc(ctx context.Context, collection string, filter any, field string, value int64) error {
	if m.incFunc != nil {
		return m.incFunc(ctx, collection, filter, field, value)
	}
	return nil
}
func (m *mockDatabase) AddToSet(ctx context.Context, collection string, filter any, field string, value any) error {
	if m.addToSetFunc != nil {
		return m.addToSetFunc(ctx, collection, filter, field, value)
	}
	return nil
}
func (m *mockDatabase) Delete(ctx context.Context, collection string, filter any) (int64, error) {
	return 0, nil
}
func (m *mockDatabase) DeleteOne(ctx context.Context, collection string, filter any) (int64, error) {
	if m.deleteOneFunc != nil {
		return m.deleteOneFunc(ctx, collection, filter)
	}
	return 0, nil
}
func (m *mockDatabase) DeleteMany(ctx context.Context, collection string, filter any) error {
	return nil
}
func (m *mockDatabase) FindOneAndUpdate(ctx context.Context, collection string, filter any, update any, result any) error {
	return nil
}
func (m *mockDatabase) Aggregate(ctx context.Context, collection string, pipeline any, result any) error {
	if m.aggregateFunc != nil {
		return m.aggregateFunc(ctx, collection, pipeline, result)
	}
	return nil
}
func (m *mockDatabase) Count(ctx context.Context, collection string, filter any) (int64, error) {
	return 0, nil
}
func (m *mockDatabase) CountDocuments(ctx context.Context, collection string, filter any) (int64, error) {
	if m.countDocumentsFunc != nil {
		return m.countDocumentsFunc(ctx, collection, filter)
	}
	return 0, nil
}
func (m *mockDatabase) EstimatedDocumentCount(ctx context.Context, collection string) (int64, error) {
	return 0, nil
}

type mockMQ struct{}

func (m *mockMQ) Publish(ctx context.Context, subject string, data []byte) error { return nil }
func (m *mockMQ) Ping(ctx context.Context) error                                 { return nil }
func (m *mockMQ) Subscribe(ctx context.Context, subject string, handler mq.MessageHandler) (mq.Subscription, error) {
	return nil, nil
}
func (m *mockMQ) QueueSubscribe(ctx context.Context, subject string, queue string, handler mq.MessageHandler) (mq.Subscription, error) {
	return nil, nil
}

func withUserContext(r *http.Request, userID string) *http.Request {
	ctx := context.WithValue(r.Context(), config.UserIDKey, userID)
	return r.WithContext(ctx)
}

func newMultipartRequest(t *testing.T, values map[string]string) *http.Request {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	for key, value := range values {
		if err := writer.WriteField(key, value); err != nil {
			t.Fatalf("write field %s: %v", key, err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/baitos", strings.NewReader(body.String()))
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req
}

func TestBaitoRequestValidate(t *testing.T) {
	tests := []struct {
		name    string
		req     BaitoRequest
		wantErr string
	}{
		{
			name: "missing title",
			req: BaitoRequest{Description: "desc", Category: "cat", SubCategory: "sub", Location: "loc", Wage: "10", Phone: "1", Requirements: "req", WorkHours: "9-5"},
			wantErr: "title is required",
		},
		{
			name: "missing deadline and duration",
			req: BaitoRequest{Title: "Title", Description: "desc", Category: "cat", SubCategory: "sub", Location: "loc", Wage: "10", Phone: "1", Requirements: "req", WorkHours: "9-5"},
			wantErr: "please provide either a job duration or an application deadline",
		},
		{
			name: "invalid deadline",
			req: BaitoRequest{Title: "Title", Description: "desc", Category: "cat", SubCategory: "sub", Location: "loc", Wage: "10", Phone: "1", Requirements: "req", WorkHours: "9-5", LastDateToApply: "not-a-date"},
			wantErr: "application deadline must be a valid YYYY-MM-DD date",
		},
		{
			name: "valid request",
			req: BaitoRequest{Title: "Title", Description: "desc", Category: "cat", SubCategory: "sub", Location: "loc", Wage: "10", Phone: "1", Requirements: "req", WorkHours: "9-5", Duration: "2 weeks"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if tt.wantErr == "" {
				if err != nil {
					t.Fatalf("Validate() unexpected error = %v", err)
				}
				return
			}
			if err == nil || !strings.Contains(err.Error(), tt.wantErr) {
				t.Fatalf("Validate() error = %v, want substring %q", err, tt.wantErr)
			}
		})
	}
}

func TestCreateBaitoHandlerRejectsInvalidPayload(t *testing.T) {
	tests := []struct {
		name       string
		values     map[string]string
		wantStatus int
	}{
		{
			name: "missing title",
			values: map[string]string{
				"description":  "Need help moving stock",
				"category":     "Logistics",
				"subcategory":  "Warehouse",
				"location":     "Nairobi",
				"wage":         "15",
				"phone":        "0712345678",
				"requirements": "Reliable",
				"workHours":    "9-5",
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "missing deadline and duration",
			values: map[string]string{
				"title":        "Warehouse Helper",
				"description":  "Need help moving stock",
				"category":     "Logistics",
				"subcategory":  "Warehouse",
				"location":     "Nairobi",
				"wage":         "15",
				"phone":        "0712345678",
				"requirements": "Reliable",
				"workHours":    "9-5",
			},
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			deps := &infra.Deps{DB: &mockDatabase{}, MQ: &mockMQ{}}
			req := withUserContext(newMultipartRequest(t, tt.values), "user-1")
			rec := httptest.NewRecorder()

			CreateBaito(deps)(rec, req, nil)

			if rec.Code != tt.wantStatus {
				t.Fatalf("expected status %d got %d; body=%s", tt.wantStatus, rec.Code, rec.Body.String())
			}
		})
	}
}

func TestDeleteBaitoHandler(t *testing.T) {
	deps := &infra.Deps{DB: &mockDatabase{deleteOneFunc: func(ctx context.Context, collection string, filter any) (int64, error) {
		if collection != BaitoCollection {
			t.Fatalf("unexpected collection %s", collection)
		}
		return 1, nil
	}}, MQ: &mockMQ{}}

	req := withUserContext(httptest.NewRequest(http.MethodDelete, "/baitos/123", nil), "user-1")
	rec := httptest.NewRecorder()

	DeleteBaito(deps)(rec, req, httprouter.Params{{Key: "baitoid", Value: "123"}})

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected status %d got %d", http.StatusNoContent, rec.Code)
	}
}

func TestApplyToBaitoHandler(t *testing.T) {
	deps := &infra.Deps{DB: &mockDatabase{
		insertFunc: func(ctx context.Context, collection string, document any) error {
			if collection != BaitoAppCollection {
				t.Fatalf("unexpected collection %s", collection)
			}
			return nil
		},
		incFunc: func(ctx context.Context, collection string, filter any, field string, value int64) error {
			if collection != BaitoCollection || field != "applicationcount" {
				t.Fatalf("unexpected inc call %s/%s", collection, field)
			}
			return nil
		},
	}, MQ: &mockMQ{}}

	req := withUserContext(newMultipartRequest(t, map[string]string{"pitch": "Happy to help"}), "user-1")
	rec := httptest.NewRecorder()

	ApplyToBaito(deps)(rec, req, httprouter.Params{{Key: "baitoid", Value: "job-1"}})

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d got %d; body=%s", http.StatusOK, rec.Code, rec.Body.String())
	}
}

func TestCreateBaitoHandler(t *testing.T) {
	deps := &infra.Deps{DB: &mockDatabase{insertFunc: func(ctx context.Context, collection string, document any) error {
		if collection != BaitoCollection {
			t.Fatalf("unexpected collection %s", collection)
		}
		baito, ok := document.(models.Baito)
		if !ok {
			t.Fatalf("unexpected document type %T", document)
		}
		if baito.Title != "Warehouse Helper" {
			t.Fatalf("unexpected title %q", baito.Title)
		}
		return nil
	}}, MQ: &mockMQ{}}

	req := withUserContext(newMultipartRequest(t, map[string]string{
		"title":           "Warehouse Helper",
		"description":     "Need help moving stock",
		"category":        "Logistics",
		"subcategory":     "Warehouse",
		"location":        "Nairobi",
		"wage":            "15",
		"phone":           "0712345678",
		"requirements":    "Reliable",
		"workHours":       "9-5",
		"duration":        "2 weeks",
		"lastDateToApply": "2026-08-01",
	}), "user-1")
	rec := httptest.NewRecorder()

	CreateBaito(deps)(rec, req, nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d got %d; body=%s", http.StatusOK, rec.Code, rec.Body.String())
	}
	var body map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body["baitoid"] == "" {
		t.Fatalf("expected baitoid in response, got %+v", body)
	}
}

func TestUpdateBaitoHandler(t *testing.T) {
	deps := &infra.Deps{DB: &mockDatabase{updateOneFunc: func(ctx context.Context, collection string, filter any, update any) error {
		if collection != BaitoCollection {
			t.Fatalf("unexpected collection %s", collection)
		}
		return nil
	}}, MQ: &mockMQ{}}

	req := withUserContext(newMultipartRequest(t, map[string]string{"title": "Updated"}), "user-1")
	rec := httptest.NewRecorder()

	UpdateBaito(deps)(rec, req, httprouter.Params{{Key: "baitoid", Value: "job-1"}})

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d got %d; body=%s", http.StatusOK, rec.Code, rec.Body.String())
	}
}

func TestCreateWorkerProfileHandler(t *testing.T) {
	deps := &infra.Deps{DB: &mockDatabase{
		findOneFunc: func(ctx context.Context, collection string, filter any, result any) error {
			if collection != BaitoWorkersCollection {
				t.Fatalf("unexpected collection %s", collection)
			}
			return mongo.ErrNoDocuments
		},
		insertFunc: func(ctx context.Context, collection string, document any) error {
			if collection != BaitoWorkersCollection {
				t.Fatalf("unexpected collection %s", collection)
			}
			return nil
		},
	}, MQ: &mockMQ{}}

	req := withUserContext(newMultipartRequest(t, map[string]string{
		"name":          "Jane",
		"age":           "25",
		"phone":         "0711111111",
		"location":      "Nairobi",
		"roles":         "helper, mover",
		"bio":           "Experienced",
		"email":         "jane@example.com",
		"experience":    "2 years",
		"skills":        "packing",
		"availability":  "weekends",
		"expected_wage": "500",
		"languages":     "English",
	}), "user-1")
	rec := httptest.NewRecorder()

	CreateWorkerProfile(deps)(rec, req, nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d got %d; body=%s", http.StatusOK, rec.Code, rec.Body.String())
	}
}

func TestUpdateWorkerProfileHandler(t *testing.T) {
	deps := &infra.Deps{DB: &mockDatabase{updateOneFunc: func(ctx context.Context, collection string, filter any, update any) error {
		if collection != BaitoWorkersCollection {
			t.Fatalf("unexpected collection %s", collection)
		}
		return nil
	}}, MQ: &mockMQ{}}

	req := withUserContext(newMultipartRequest(t, map[string]string{"name": "Jane"}), "user-1")
	rec := httptest.NewRecorder()

	UpdateWorkerProfile(deps)(rec, req, httprouter.Params{{Key: "id", Value: "worker-1"}})

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d got %d; body=%s", http.StatusOK, rec.Code, rec.Body.String())
	}
}

func TestGetLatestBaitosHandler(t *testing.T) {
	deps := &infra.Deps{DB: &mockDatabase{findManyWithOptionsFunc: func(ctx context.Context, collection string, filter any, opts db.FindManyOptions, result any) error {
		if collection != BaitoCollection {
			t.Fatalf("unexpected collection %s", collection)
		}
		v := reflect.ValueOf(result)
		if v.Kind() != reflect.Ptr {
			t.Fatalf("result must be pointer")
		}
		v.Elem().Set(reflect.ValueOf([]models.BaitosResponse{{BaitoId: "job-1", Title: "Test"}}))
		return nil
	}}}

	req := httptest.NewRequest(http.MethodGet, "/baitos", nil)
	rec := httptest.NewRecorder()

	GetLatestBaitos(deps)(rec, req, nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d got %d", http.StatusOK, rec.Code)
	}
}

func TestGetRelatedBaitosHandler(t *testing.T) {
	deps := &infra.Deps{DB: &mockDatabase{findManyWithOptionsFunc: func(ctx context.Context, collection string, filter any, opts db.FindManyOptions, result any) error {
		if collection != BaitoCollection {
			t.Fatalf("unexpected collection %s", collection)
		}
		reflect.ValueOf(result).Elem().Set(reflect.ValueOf([]models.BaitosResponse{{BaitoId: "job-2", Title: "Related"}}))
		return nil
	}}}

	req := httptest.NewRequest(http.MethodGet, "/baitos/related?category=Logistics", nil)
	rec := httptest.NewRecorder()

	GetRelatedBaitos(deps)(rec, req, nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d got %d", http.StatusOK, rec.Code)
	}
}

func TestGetBaitoByIDHandler(t *testing.T) {
	deps := &infra.Deps{DB: &mockDatabase{
		findOneFunc: func(ctx context.Context, collection string, filter any, result any) error {
			if collection != BaitoCollection {
				t.Fatalf("unexpected collection %s", collection)
			}
			baito := result.(*models.Baito)
			*baito = models.Baito{BaitoId: "job-1", Title: "Test"}
			return nil
		},
		countDocumentsFunc: func(ctx context.Context, collection string, filter any) (int64, error) {
			if collection != BaitoAppCollection {
				t.Fatalf("unexpected collection %s", collection)
			}
			return 2, nil
		},
	}}

	req := httptest.NewRequest(http.MethodGet, "/baitos/job-1", nil)
	rec := httptest.NewRecorder()

	GetBaitoByID(deps)(rec, req, httprouter.Params{{Key: "baitoid", Value: "job-1"}})

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d got %d", http.StatusOK, rec.Code)
	}
}

func TestGetMyBaitosHandler(t *testing.T) {
	deps := &infra.Deps{DB: &mockDatabase{findManyWithOptionsFunc: func(ctx context.Context, collection string, filter any, opts db.FindManyOptions, result any) error {
		reflect.ValueOf(result).Elem().Set(reflect.ValueOf([]models.BaitosResponse{{BaitoId: "mine", Title: "Mine"}}))
		return nil
	}}}

	req := withUserContext(httptest.NewRequest(http.MethodGet, "/baitos/me", nil), "user-1")
	rec := httptest.NewRecorder()

	GetMyBaitos(deps)(rec, req, nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d got %d", http.StatusOK, rec.Code)
	}
}

func TestGetBaitoApplicantsHandler(t *testing.T) {
	deps := &infra.Deps{DB: &mockDatabase{findManyFunc: func(ctx context.Context, collection string, filter any, result any, opts ...*options.FindOptions) error {
		reflect.ValueOf(result).Elem().Set(reflect.ValueOf([]bson.M{{"userid": "u1"}}))
		return nil
	}}}

	req := httptest.NewRequest(http.MethodGet, "/baitos/job-1/applicants", nil)
	rec := httptest.NewRecorder()

	GetBaitoApplicants(deps)(rec, req, httprouter.Params{{Key: "baitoid", Value: "job-1"}})

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d got %d", http.StatusOK, rec.Code)
	}
}

func TestGetMyApplicationsHandler(t *testing.T) {
	deps := &infra.Deps{DB: &mockDatabase{aggregateFunc: func(ctx context.Context, collection string, pipeline any, result any) error {
		reflect.ValueOf(result).Elem().Set(reflect.ValueOf([]bson.M{{"jobId": "job-1"}}))
		return nil
	}}}

	req := withUserContext(httptest.NewRequest(http.MethodGet, "/applications/me", nil), "user-1")
	rec := httptest.NewRecorder()

	GetMyApplications(deps)(rec, req, nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d got %d", http.StatusOK, rec.Code)
	}
}

func Example() {
	fmt.Println("baito handlers covered")
	// Output: baito handlers covered
}
