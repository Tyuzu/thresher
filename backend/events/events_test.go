package events

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"naevis/config"
	"naevis/infra"
	"naevis/infra/db"
	inmq "naevis/infra/mq"
	"naevis/models"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type stubDB struct {
	insertErr              error
	insertOneErr           error
	findOneErr             error
	updateOneErr           error
	aggregateErr           error
	countDocumentsErr      error
	findManyWithOptionsErr error
	findOneResult          models.Event
	events                 []models.Event
	count                  int64
	insertCalls            int
	insertOneCalls         int
	updateOneCalls         int
	findOneCalls           int
	aggregateCalls         int
	countDocumentsCalls    int
	findManyCalls          int
}

func (s *stubDB) Ping(ctx context.Context) error { return nil }
func (s *stubDB) WithDB(ctx context.Context, op func(ctx context.Context) error) error {
	return op(ctx)
}
func (s *stubDB) RunTransaction(ctx context.Context, fn func(ctx context.Context) error) error {
	return fn(ctx)
}
func (s *stubDB) Insert(ctx context.Context, collection string, document any) error {
	s.insertCalls++
	return s.insertErr
}
func (s *stubDB) InsertOne(ctx context.Context, collection string, document any) error {
	s.insertOneCalls++
	return s.insertOneErr
}
func (s *stubDB) InsertMany(ctx context.Context, collection string, documents []any) error {
	return nil
}
func (s *stubDB) BulkWrite(ctx context.Context, collection string, operations []any) error {
	return nil
}
func (s *stubDB) FindOne(ctx context.Context, collection string, filter any, result any) error {
	s.findOneCalls++
	if s.findOneErr != nil {
		return s.findOneErr
	}
	if event, ok := result.(*models.Event); ok {
		*event = s.findOneResult
	}
	return nil
}
func (s *stubDB) FindOneWithProjection(ctx context.Context, collection string, filter any, projection []string, result any) error {
	return s.FindOne(ctx, collection, filter, result)
}
func (s *stubDB) FindMany(ctx context.Context, collection string, filter any, result any, opts ...*options.FindOptions) error {
	return nil
}
func (s *stubDB) FindManyWithOptions(ctx context.Context, collection string, filter any, opts db.FindManyOptions, result any) error {
	s.findManyCalls++
	if s.findManyWithOptionsErr != nil {
		return s.findManyWithOptionsErr
	}
	if out, ok := result.(*[]models.Event); ok {
		*out = append([]models.Event(nil), s.events...)
	}
	return nil
}
func (s *stubDB) FindManyWithProjection(ctx context.Context, collection string, filter any, projection []string, opts db.FindManyOptions, result any) error {
	return s.FindManyWithOptions(ctx, collection, filter, opts, result)
}
func (s *stubDB) Distinct(ctx context.Context, collection string, field string, filter any, result any) error {
	return nil
}
func (s *stubDB) Update(ctx context.Context, collection string, filter any, update any) error {
	return nil
}
func (s *stubDB) UpdateOne(ctx context.Context, collection string, filter any, update any) error {
	s.updateOneCalls++
	return s.updateOneErr
}
func (s *stubDB) UpdateMany(ctx context.Context, collection string, filter any, update any) error {
	return nil
}
func (s *stubDB) Upsert(ctx context.Context, collection string, filter any, document any) error {
	return nil
}
func (s *stubDB) Inc(ctx context.Context, collection string, filter any, field string, value int64) error {
	return nil
}
func (s *stubDB) AddToSet(ctx context.Context, collection string, filter any, field string, value any) error {
	return nil
}
func (s *stubDB) Delete(ctx context.Context, collection string, filter any) (int64, error) {
	return 1, nil
}
func (s *stubDB) DeleteOne(ctx context.Context, collection string, filter any) (int64, error) {
	return 1, nil
}
func (s *stubDB) DeleteMany(ctx context.Context, collection string, filter any) error { return nil }
func (s *stubDB) FindOneAndUpdate(ctx context.Context, collection string, filter any, update any, result any) error {
	return nil
}
func (s *stubDB) Aggregate(ctx context.Context, collection string, pipeline any, result any) error {
	s.aggregateCalls++
	if s.aggregateErr != nil {
		return s.aggregateErr
	}
	if out, ok := result.(*[]models.Event); ok {
		*out = append([]models.Event(nil), s.events...)
	}
	return nil
}
func (s *stubDB) Count(ctx context.Context, collection string, filter any) (int64, error) {
	return s.count, nil
}
func (s *stubDB) CountDocuments(ctx context.Context, collection string, filter any) (int64, error) {
	s.countDocumentsCalls++
	if s.countDocumentsErr != nil {
		return 0, s.countDocumentsErr
	}
	return s.count, nil
}
func (s *stubDB) EstimatedDocumentCount(ctx context.Context, collection string) (int64, error) {
	return s.count, nil
}

type stubMQ struct{ published []string }

func (s *stubMQ) Publish(ctx context.Context, subject string, data []byte) error {
	s.published = append(s.published, subject)
	return nil
}
func (s *stubMQ) Ping(ctx context.Context) error { return nil }
func (s *stubMQ) Subscribe(ctx context.Context, subject string, handler inmq.MessageHandler) (inmq.Subscription, error) {
	return nil, nil
}
func (s *stubMQ) QueueSubscribe(ctx context.Context, subject string, queue string, handler inmq.MessageHandler) (inmq.Subscription, error) {
	return nil, nil
}

func newEventApp(dbLayer *stubDB, mqLayer *stubMQ) *infra.Deps {
	return &infra.Deps{DB: dbLayer, MQ: mqLayer}
}

func newMultipartRequest(t *testing.T, fields map[string]string) *http.Request {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	for key, value := range fields {
		_ = writer.WriteField(key, value)
	}
	_ = writer.Close()
	req := httptest.NewRequest(http.MethodPost, "/events", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req
}

func TestCreateEventHandler(t *testing.T) {
	tests := []struct {
		name       string
		formFields map[string]string
		userID     string
		wantStatus int
	}{
		{
			name: "creates event successfully",
			formFields: map[string]string{
				"event": `{"title":"Launch","date":"2026-01-02T00:00:00Z","category":"music","location":"Delhi","description":"desc","placeid":"p1","placename":"Place"}`,
			},
			userID:     "user-1",
			wantStatus: http.StatusOK,
		},
		{
			name:       "rejects missing event payload",
			formFields: map[string]string{},
			userID:     "user-1",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dbLayer := &stubDB{}
			mqLayer := &stubMQ{}
			app := newEventApp(dbLayer, mqLayer)
			req := newMultipartRequest(t, tt.formFields)
			req = req.WithContext(context.WithValue(req.Context(), config.UserIDKey, tt.userID))

			recorder := httptest.NewRecorder()
			CreateEvent(app)(recorder, req, nil)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", recorder.Code, tt.wantStatus)
			}
			if tt.wantStatus == http.StatusOK && dbLayer.insertCalls == 0 {
				t.Fatalf("expected insert to be called")
			}
		})
	}
}

func TestEditEventHandler(t *testing.T) {
	tests := []struct {
		name       string
		formFields map[string]string
		wantStatus int
	}{
		{
			name: "updates event successfully",
			formFields: map[string]string{
				"event": `{"title":"Updated","date":"2026-03-02T00:00:00Z","category":"music","location":"Delhi","description":"desc","placeid":"p1","placename":"Place"}`,
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "rejects invalid update payload",
			formFields: map[string]string{
				"event": `{"title":""}`,
			},
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dbLayer := &stubDB{findOneResult: models.Event{EventID: "evt-1"}}
			app := newEventApp(dbLayer, &stubMQ{})
			req := newMultipartRequest(t, tt.formFields)
			recorder := httptest.NewRecorder()
			EditEvent(app)(recorder, req, httprouter.Params{{Key: "eventid", Value: "evt-1"}})

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", recorder.Code, tt.wantStatus)
			}
		})
	}
}

func TestGetEventHandler(t *testing.T) {
	tests := []struct {
		name       string
		eventID    string
		stubEvents []models.Event
		wantStatus int
	}{
		{name: "returns event when found", eventID: "evt-1", stubEvents: []models.Event{{EventID: "evt-1", Title: "Party", Tickets: []models.Ticket{{Price: 1200, Currency: "INR"}}}}, wantStatus: http.StatusOK},
		{name: "returns not found when missing", eventID: "missing", stubEvents: nil, wantStatus: http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dbLayer := &stubDB{events: tt.stubEvents}
			app := newEventApp(dbLayer, &stubMQ{})
			recorder := httptest.NewRecorder()
			GetEvent(app)(recorder, httptest.NewRequest(http.MethodGet, "/events/"+tt.eventID, nil), httprouter.Params{{Key: "eventid", Value: tt.eventID}})

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", recorder.Code, tt.wantStatus)
			}
		})
	}
}

func TestGetEventsHandler(t *testing.T) {
	tests := []struct {
		name       string
		count      int64
		stubEvents []models.Event
		wantStatus int
	}{
		{name: "returns paginated events", count: 3, stubEvents: []models.Event{{EventID: "e1", Title: "One"}}, wantStatus: http.StatusOK},
		{name: "handles db errors", count: 0, stubEvents: nil, wantStatus: http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dbLayer := &stubDB{count: tt.count, events: tt.stubEvents}
			if tt.name == "handles db errors" {
				dbLayer.findManyWithOptionsErr = fmt.Errorf("boom")
			}
			app := newEventApp(dbLayer, &stubMQ{})
			recorder := httptest.NewRecorder()
			GetEvents(app)(recorder, httptest.NewRequest(http.MethodGet, "/events", nil), nil)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", recorder.Code, tt.wantStatus)
			}
		})
	}
}

func TestGetEventsCountHandler(t *testing.T) {
	recorder := httptest.NewRecorder()
	GetEventsCount(nil)(recorder, httptest.NewRequest(http.MethodGet, "/events/count", nil), nil)
	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusOK)
	}
	var count int
	if err := json.Unmarshal(recorder.Body.Bytes(), &count); err != nil {
		t.Fatalf("decode count: %v", err)
	}
	if count != 3 {
		t.Fatalf("count = %d, want 3", count)
	}
}

func TestAddFAQsHandler(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
	}{
		{name: "adds faq successfully", body: `{"title":"Q","content":"A"}`, wantStatus: http.StatusOK},
		{name: "rejects invalid payload", body: `{"title":"Q"}`, wantStatus: http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dbLayer := &stubDB{}
			app := newEventApp(dbLayer, &stubMQ{})
			req := httptest.NewRequest(http.MethodPost, "/events/evt-1/faqs", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			recorder := httptest.NewRecorder()
			AddFAQs(app)(recorder, req, httprouter.Params{{Key: "eventid", Value: "evt-1"}})

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", recorder.Code, tt.wantStatus)
			}
		})
	}
}

func TestDeleteEventHandler(t *testing.T) {
	tests := []struct {
		name       string
		params     httprouter.Params
		userID     string
		wantStatus int
	}{
		{name: "deletes event successfully", params: httprouter.Params{{Key: "eventid", Value: "evt-1"}}, userID: "user-1", wantStatus: http.StatusOK},
		{name: "rejects missing id", params: nil, userID: "user-1", wantStatus: http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dbLayer := &stubDB{findOneResult: models.Event{EventID: "evt-1", CreatorID: tt.userID}}
			app := newEventApp(dbLayer, &stubMQ{})
			req := httptest.NewRequest(http.MethodDelete, "/events/evt-1", nil)
			req = req.WithContext(context.WithValue(req.Context(), config.UserIDKey, tt.userID))
			recorder := httptest.NewRecorder()
			DeleteEvent(app)(recorder, req, tt.params)

			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", recorder.Code, tt.wantStatus)
			}
		})
	}
}
