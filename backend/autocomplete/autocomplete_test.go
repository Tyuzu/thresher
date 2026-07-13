package autocomplete

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"

	"naevis/infra"
	"naevis/infra/db"
	"naevis/models"
)

type stubAutocompleteDB struct {
	db.Database
	findManyErr error
	places      []models.Place
	users       []models.User
}

func (s *stubAutocompleteDB) FindMany(_ context.Context, _ string, filter any, result any, _ ...*options.FindOptions) error {
	if s.findManyErr != nil {
		return s.findManyErr
	}
	if _, ok := filter.(bson.M)["name"]; ok {
		if target, ok := result.(*[]models.Place); ok {
			*target = s.places
		}
		return nil
	}
	if _, ok := filter.(bson.M)["username"]; ok {
		if target, ok := result.(*[]models.User); ok {
			*target = s.users
		}
		return nil
	}
	return nil
}

func newAutocompleteDeps(database db.Database) *infra.Deps {
	return &infra.Deps{DB: database}
}

func TestAutocompletePlacesHandler(t *testing.T) {
	tests := []struct {
		name         string
		query        string
		places       []models.Place
		dbErr        error
		expectedCode int
		expectedLen  int
	}{
		{name: "returns empty list for short query", query: "a", expectedCode: http.StatusOK, expectedLen: 0},
		{name: "returns place suggestions", query: "par", places: []models.Place{{PlaceID: "p1", Name: "Paris", Banner: "banner", Category: "city"}}, expectedCode: http.StatusOK, expectedLen: 1},
		{name: "returns server error when lookup fails", query: "par", dbErr: errors.New("boom"), expectedCode: http.StatusInternalServerError, expectedLen: 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			stub := &stubAutocompleteDB{places: tt.places, findManyErr: tt.dbErr}
			app := newAutocompleteDeps(stub)

			req := httptest.NewRequest(http.MethodGet, "/autocomplete/places?query="+tt.query, nil)
			rec := httptest.NewRecorder()
			handler := AutocompletePlaces(app)
			handler(rec, req, nil)

			if rec.Code != tt.expectedCode {
				t.Fatalf("expected status %d, got %d with body %s", tt.expectedCode, rec.Code, rec.Body.String())
			}

			if tt.expectedCode != http.StatusOK {
				var payload map[string]string
				if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
					t.Fatalf("expected valid JSON error payload: %v", err)
				}
				return
			}

			var response []models.PlaceSuggestion
			if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
				t.Fatalf("expected valid JSON payload: %v", err)
			}
			if len(response) != tt.expectedLen {
				t.Fatalf("expected %d suggestions, got %d", tt.expectedLen, len(response))
			}
		})
	}
}

func TestAutocompleteUsersHandler(t *testing.T) {
	tests := []struct {
		name         string
		query        string
		users        []models.User
		dbErr        error
		expectedCode int
		expectedLen  int
	}{
		{name: "returns empty list for short query", query: "a", expectedCode: http.StatusOK, expectedLen: 0},
		{name: "returns user suggestions", query: "jo", users: []models.User{{UserID: "u1", Username: "jose", Avatar: "avatar"}}, expectedCode: http.StatusOK, expectedLen: 1},
		{name: "returns server error when lookup fails", query: "jo", dbErr: errors.New("boom"), expectedCode: http.StatusInternalServerError, expectedLen: 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			stub := &stubAutocompleteDB{users: tt.users, findManyErr: tt.dbErr}
			app := newAutocompleteDeps(stub)

			req := httptest.NewRequest(http.MethodGet, "/autocomplete/users?query="+tt.query, nil)
			rec := httptest.NewRecorder()
			handler := AutocompleteUsers(app)
			handler(rec, req, nil)

			if rec.Code != tt.expectedCode {
				t.Fatalf("expected status %d, got %d with body %s", tt.expectedCode, rec.Code, rec.Body.String())
			}

			if tt.expectedCode != http.StatusOK {
				var payload map[string]string
				if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
					t.Fatalf("expected valid JSON error payload: %v", err)
				}
				return
			}

			var response []models.UserSuggestion
			if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
				t.Fatalf("expected valid JSON payload: %v", err)
			}
			if len(response) != tt.expectedLen {
				t.Fatalf("expected %d suggestions, got %d", tt.expectedLen, len(response))
			}
		})
	}
}
