package itinerary

import (
	"context"
	"errors"
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
	"go.mongodb.org/mongo-driver/mongo/options"
)

func TestItineraryHandlers(t *testing.T) {
	tests := []struct {
		name            string
		handler         func(*infra.Deps) httprouter.Handle
		method          string
		path            string
		body            string
		userID          string
		params          httprouter.Params
		setup           func(*stubDB)
		wantStatus      int
		wantBodyContain string
		assert          func(*testing.T, *stubDB)
	}{
		{
			name:            "CreateItinerary creates a draft itinerary",
			handler:         CreateItinerary,
			method:          http.MethodPost,
			path:            "/api/itineraries",
			body:            `{"name":"Trip","description":"A short trip","days":[]}`,
			userID:          "user-1",
			wantStatus:      http.StatusCreated,
			wantBodyContain: "itineraryid",
			assert: func(t *testing.T, stub *stubDB) {
				t.Helper()
				if len(stub.itineraries) != 1 {
					t.Fatalf("expected one itinerary to be stored, got %d", len(stub.itineraries))
				}
				if stub.itineraries[0].UserID != "user-1" {
					t.Fatalf("expected owner user-1, got %s", stub.itineraries[0].UserID)
				}
			},
		},
		{
			name:            "UpdateItinerary updates itinerary fields",
			handler:         UpdateItinerary,
			method:          http.MethodPut,
			path:            "/api/itineraries/it-1",
			body:            `{"name":"Updated","description":"Fresh","status":"Confirmed","published":true,"days":[]}`,
			userID:          "user-1",
			params:          httprouter.Params{{Key: "id", Value: "it-1"}},
			wantStatus:      http.StatusOK,
			wantBodyContain: "updated successfully",
			setup: func(stub *stubDB) {
				stub.itineraries = []models.Itinerary{{ItineraryID: "it-1", UserID: "user-1", Name: "Old", Status: "Draft"}}
			},
			assert: func(t *testing.T, stub *stubDB) {
				t.Helper()
				if len(stub.itineraries) != 1 {
					t.Fatalf("expected one itinerary after update, got %d", len(stub.itineraries))
				}
				if stub.itineraries[0].Name != "Updated" || stub.itineraries[0].Status != "Confirmed" || !stub.itineraries[0].Published {
					t.Fatalf("expected updated itinerary state, got %+v", stub.itineraries[0])
				}
			},
		},
		{
			name:            "DeleteItinerary soft deletes itinerary",
			handler:         DeleteItinerary,
			method:          http.MethodDelete,
			path:            "/api/itineraries/it-2",
			userID:          "user-1",
			params:          httprouter.Params{{Key: "id", Value: "it-2"}},
			wantStatus:      http.StatusOK,
			wantBodyContain: "deleted",
			setup: func(stub *stubDB) {
				stub.itineraries = []models.Itinerary{{ItineraryID: "it-2", UserID: "user-1", Name: "Delete me"}}
			},
			assert: func(t *testing.T, stub *stubDB) {
				t.Helper()
				if !stub.itineraries[0].Deleted {
					t.Fatal("expected itinerary to be marked deleted")
				}
			},
		},
		{
			name:            "ForkItinerary creates a forked copy",
			handler:         ForkItinerary,
			method:          http.MethodPost,
			path:            "/api/itineraries/it-3/fork",
			userID:          "user-2",
			params:          httprouter.Params{{Key: "id", Value: "it-3"}},
			wantStatus:      http.StatusCreated,
			wantBodyContain: "Forked - ",
			setup: func(stub *stubDB) {
				stub.itineraries = []models.Itinerary{{ItineraryID: "it-3", UserID: "user-1", Name: "Original", Days: []models.Day{{Date: "2026-01-01", Visits: []models.Visit{{Location: "Paris"}}}}}}
			},
			assert: func(t *testing.T, stub *stubDB) {
				t.Helper()
				if len(stub.itineraries) != 2 {
					t.Fatalf("expected original and forked itineraries, got %d", len(stub.itineraries))
				}
				forked := stub.itineraries[1]
				if forked.UserID != "user-2" || forked.ForkedFrom == nil || *forked.ForkedFrom != "it-3" {
					t.Fatalf("expected fork metadata to be set, got %+v", forked)
				}
			},
		},
		{
			name:            "PublishItinerary publishes itinerary",
			handler:         PublishItinerary,
			method:          http.MethodPut,
			path:            "/api/itineraries/it-4/publish",
			userID:          "user-1",
			params:          httprouter.Params{{Key: "id", Value: "it-4"}},
			wantStatus:      http.StatusOK,
			wantBodyContain: "published",
			setup: func(stub *stubDB) {
				stub.itineraries = []models.Itinerary{{ItineraryID: "it-4", UserID: "user-1", Name: "Publish me"}}
			},
			assert: func(t *testing.T, stub *stubDB) {
				t.Helper()
				if !stub.itineraries[0].Published {
					t.Fatal("expected itinerary to be published")
				}
			},
		},
		{
			name:            "GetItinerary returns itinerary by id",
			handler:         GetItinerary,
			method:          http.MethodGet,
			path:            "/api/itineraries/all/it-5",
			params:          httprouter.Params{{Key: "id", Value: "it-5"}},
			wantStatus:      http.StatusOK,
			wantBodyContain: "Trip to Rome",
			setup: func(stub *stubDB) {
				stub.itineraries = []models.Itinerary{{ItineraryID: "it-5", Name: "Trip to Rome", Days: []models.Day{{Date: "2026-02-01"}}}}
			},
		},
		{
			name:            "GetItineraries returns active itineraries",
			handler:         GetItineraries,
			method:          http.MethodGet,
			path:            "/api/itineraries",
			wantStatus:      http.StatusOK,
			wantBodyContain: "Active trip",
			setup: func(stub *stubDB) {
				stub.itineraries = []models.Itinerary{{ItineraryID: "it-6", Name: "Active trip"}, {ItineraryID: "it-7", Name: "Deleted trip", Deleted: true}}
			},
		},
		{
			name:            "SearchItineraries filters by query params",
			handler:         SearchItineraries,
			method:          http.MethodGet,
			path:            "/api/itineraries/search?location=Paris&status=Confirmed",
			wantStatus:      http.StatusOK,
			wantBodyContain: "Paris",
			setup: func(stub *stubDB) {
				stub.itineraries = []models.Itinerary{{ItineraryID: "it-8", Name: "City break", Status: "Confirmed", Days: []models.Day{{Visits: []models.Visit{{Location: "Paris"}}}}}, {ItineraryID: "it-9", Name: "Beach break", Status: "Confirmed", Days: []models.Day{{Visits: []models.Visit{{Location: "Dubai"}}}}}}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			stub := &stubDB{}
			if tt.setup != nil {
				tt.setup(stub)
			}

			app := &infra.Deps{DB: stub, MQ: &stubMQ{}}
			req := httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
			if tt.userID != "" {
				req = req.WithContext(context.WithValue(req.Context(), config.UserIDKey, tt.userID))
			}
			rec := httptest.NewRecorder()

			tt.handler(app)(rec, req, tt.params)

			if rec.Code != tt.wantStatus {
				t.Fatalf("expected status %d, got %d with body %s", tt.wantStatus, rec.Code, rec.Body.String())
			}
			if tt.wantBodyContain != "" && !strings.Contains(rec.Body.String(), tt.wantBodyContain) {
				t.Fatalf("expected body to contain %q, got %s", tt.wantBodyContain, rec.Body.String())
			}
			if tt.assert != nil {
				tt.assert(t, stub)
			}
		})
	}
}

type stubDB struct {
	db.Database
	itineraries []models.Itinerary
	findErr     error
	insertErr   error
	updateErr   error
}

func (s *stubDB) Insert(_ context.Context, _ string, document any) error {
	if s.insertErr != nil {
		return s.insertErr
	}
	itinerary, ok := document.(models.Itinerary)
	if !ok {
		return errors.New("unexpected document type")
	}
	s.itineraries = append(s.itineraries, itinerary)
	return nil
}

func (s *stubDB) FindOne(_ context.Context, _ string, filter any, result any) error {
	if s.findErr != nil {
		return s.findErr
	}
	if result == nil {
		return errors.New("invalid result")
	}
	filterMap, _ := filter.(map[string]any)
	for i := range s.itineraries {
		if itineraryMatchesFilter(s.itineraries[i], filterMap) {
			return setItineraryResult(result, s.itineraries[i])
		}
	}
	return errors.New("not found")
}

func (s *stubDB) FindMany(_ context.Context, _ string, filter any, result any, _ ...*options.FindOptions) error {
	filterMap, _ := filter.(map[string]any)
	items := reflect.ValueOf(result)
	if items.Kind() != reflect.Ptr || items.Elem().Kind() != reflect.Slice {
		return errors.New("invalid result")
	}
	matches := make([]models.Itinerary, 0, len(s.itineraries))
	for _, itinerary := range s.itineraries {
		if itineraryMatchesFilter(itinerary, filterMap) {
			matches = append(matches, itinerary)
		}
	}
	items.Elem().Set(reflect.ValueOf(matches))
	return nil
}

func (s *stubDB) UpdateOne(_ context.Context, _ string, filter any, update any) error {
	if s.updateErr != nil {
		return s.updateErr
	}
	filterMap, _ := filter.(map[string]any)
	updateMap, _ := update.(map[string]any)
	setFields, _ := updateMap["$set"].(map[string]any)
	for i := range s.itineraries {
		if !itineraryMatchesFilter(s.itineraries[i], filterMap) {
			continue
		}
		if name, ok := setFields["name"].(string); ok {
			s.itineraries[i].Name = name
		}
		if description, ok := setFields["description"].(string); ok {
			s.itineraries[i].Description = description
		}
		if startDate, ok := setFields["start_date"].(string); ok {
			s.itineraries[i].StartDate = startDate
		}
		if endDate, ok := setFields["end_date"].(string); ok {
			s.itineraries[i].EndDate = endDate
		}
		if status, ok := setFields["status"].(string); ok {
			s.itineraries[i].Status = status
		}
		if published, ok := setFields["published"].(bool); ok {
			s.itineraries[i].Published = published
		}
		if days, ok := setFields["days"].([]models.Day); ok {
			s.itineraries[i].Days = days
		}
		if deleted, ok := setFields["deleted"].(bool); ok {
			s.itineraries[i].Deleted = deleted
		}
		return nil
	}
	return errors.New("not found")
}

func itineraryMatchesFilter(itinerary models.Itinerary, filter map[string]any) bool {
	if filter == nil {
		return true
	}
	if deletedFilter, ok := filter["deleted"].(map[string]any); ok {
		if ne, ok := deletedFilter["$ne"].(bool); ok && ne && itinerary.Deleted {
			return false
		}
	}
	if itineraryID, ok := filter["itineraryid"].(string); ok && itineraryID != "" && itinerary.ItineraryID != itineraryID {
		return false
	}
	if userID, ok := filter["userid"].(string); ok && userID != "" && itinerary.UserID != userID {
		return false
	}
	if status, ok := filter["status"].(string); ok && status != "" && itinerary.Status != status {
		return false
	}
	if startDate, ok := filter["start_date"].(string); ok && startDate != "" && itinerary.StartDate != startDate {
		return false
	}
	if locationFilter, ok := filter["days.visits.location"].(map[string]any); ok {
		if inValues, ok := locationFilter["$in"].([]string); ok {
			matched := false
			for _, day := range itinerary.Days {
				for _, visit := range day.Visits {
					for _, location := range inValues {
						if visit.Location == location {
							matched = true
							break
						}
					}
					if matched {
						break
					}
				}
				if matched {
					break
				}
			}
			if !matched {
				return false
			}
		}
	}
	return true
}

func setItineraryResult(result any, itinerary models.Itinerary) error {
	value := reflect.ValueOf(result)
	if value.Kind() != reflect.Ptr || value.Elem().Kind() != reflect.Struct {
		return errors.New("invalid result")
	}
	value.Elem().Set(reflect.ValueOf(itinerary))
	return nil
}

type stubMQ struct{}

func (s *stubMQ) Publish(context.Context, string, []byte) error { return nil }
func (s *stubMQ) Ping(context.Context) error                    { return nil }
func (s *stubMQ) Subscribe(context.Context, string, mq.MessageHandler) (mq.Subscription, error) {
	return stubSub{}, nil
}
func (s *stubMQ) QueueSubscribe(context.Context, string, string, mq.MessageHandler) (mq.Subscription, error) {
	return stubSub{}, nil
}

type stubSub struct{}

func (s stubSub) Unsubscribe() error { return nil }
