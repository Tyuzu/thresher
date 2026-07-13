package home

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"naevis/infra"
	"naevis/infra/db"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type mockHomeDB struct {
	findManyWithOptionsFunc func(ctx context.Context, collection string, filter any, opts db.FindManyOptions, result any) error
}

func (m *mockHomeDB) Ping(ctx context.Context) error { return nil }
func (m *mockHomeDB) WithDB(ctx context.Context, op func(ctx context.Context) error) error {
	return op(ctx)
}
func (m *mockHomeDB) RunTransaction(ctx context.Context, fn func(ctx context.Context) error) error {
	return fn(ctx)
}
func (m *mockHomeDB) Insert(ctx context.Context, collection string, document any) error { return nil }
func (m *mockHomeDB) InsertOne(ctx context.Context, collection string, document any) error {
	return nil
}
func (m *mockHomeDB) InsertMany(ctx context.Context, collection string, documents []any) error {
	return nil
}
func (m *mockHomeDB) BulkWrite(ctx context.Context, collection string, operations []any) error {
	return nil
}
func (m *mockHomeDB) FindOne(ctx context.Context, collection string, filter any, result any) error {
	return nil
}
func (m *mockHomeDB) FindOneWithProjection(ctx context.Context, collection string, filter any, projection []string, result any) error {
	return nil
}
func (m *mockHomeDB) FindMany(ctx context.Context, collection string, filter any, result any, opts ...*options.FindOptions) error {
	return nil
}
func (m *mockHomeDB) FindManyWithOptions(ctx context.Context, collection string, filter any, opts db.FindManyOptions, result any) error {
	if m.findManyWithOptionsFunc != nil {
		return m.findManyWithOptionsFunc(ctx, collection, filter, opts, result)
	}
	return nil
}
func (m *mockHomeDB) FindManyWithProjection(ctx context.Context, collection string, filter any, projection []string, opts db.FindManyOptions, result any) error {
	return nil
}
func (m *mockHomeDB) Distinct(ctx context.Context, collection string, field string, filter any, result any) error {
	return nil
}
func (m *mockHomeDB) Update(ctx context.Context, collection string, filter any, update any) error {
	return nil
}
func (m *mockHomeDB) UpdateOne(ctx context.Context, collection string, filter any, update any) error {
	return nil
}
func (m *mockHomeDB) UpdateMany(ctx context.Context, collection string, filter any, update any) error {
	return nil
}
func (m *mockHomeDB) Upsert(ctx context.Context, collection string, filter any, document any) error {
	return nil
}
func (m *mockHomeDB) Inc(ctx context.Context, collection string, filter any, field string, value int64) error {
	return nil
}
func (m *mockHomeDB) AddToSet(ctx context.Context, collection string, filter any, field string, value any) error {
	return nil
}
func (m *mockHomeDB) Delete(ctx context.Context, collection string, filter any) (int64, error) {
	return 0, nil
}
func (m *mockHomeDB) DeleteOne(ctx context.Context, collection string, filter any) (int64, error) {
	return 0, nil
}
func (m *mockHomeDB) DeleteMany(ctx context.Context, collection string, filter any) error { return nil }
func (m *mockHomeDB) FindOneAndUpdate(ctx context.Context, collection string, filter any, update any, result any) error {
	return nil
}
func (m *mockHomeDB) Aggregate(ctx context.Context, collection string, pipeline any, result any) error {
	return nil
}
func (m *mockHomeDB) Count(ctx context.Context, collection string, filter any) (int64, error) {
	return 0, nil
}
func (m *mockHomeDB) CountDocuments(ctx context.Context, collection string, filter any) (int64, error) {
	return 0, nil
}
func (m *mockHomeDB) EstimatedDocumentCount(ctx context.Context, collection string) (int64, error) {
	return 0, nil
}

func TestHomeCardsHandler(t *testing.T) {
	tests := []struct {
		name              string
		category          string
		findManyErr       error
		wantStatus        int
		wantCards         []HomeCard
		wantCollection    string
		wantLimit         int
		wantCalled        bool
		wantErrorContains string
	}{
		{
			name:           "returns mapped cards for places",
			category:       "Places",
			wantStatus:     http.StatusOK,
			wantCards:      []HomeCard{{Title: "Sunset", Description: "Nice place", Href: "/place/p1", Banner: "banner.jpg"}},
			wantCollection: "places",
			wantLimit:      20,
			wantCalled:     true,
		},
		{
			name:       "returns empty list for unsupported category",
			category:   "Unknown",
			wantStatus: http.StatusOK,
			wantCards:  []HomeCard{},
			wantCalled: false,
		},
		{
			name:              "returns server error when database fails",
			category:          "Places",
			findManyErr:       context.DeadlineExceeded,
			wantStatus:        http.StatusInternalServerError,
			wantCards:         nil,
			wantCalled:        true,
			wantErrorContains: "Failed to fetch home cards",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			called := false
			mockDB := &mockHomeDB{findManyWithOptionsFunc: func(ctx context.Context, collection string, filter any, opts db.FindManyOptions, result any) error {
				called = true
				if tt.findManyErr != nil {
					return tt.findManyErr
				}
				if tt.wantCollection != "" {
					if collection != tt.wantCollection {
						t.Fatalf("expected collection %s, got %s", tt.wantCollection, collection)
					}
				}
				if opts.Limit != tt.wantLimit {
					t.Fatalf("expected limit %d, got %d", tt.wantLimit, opts.Limit)
				}
				if opts.Skip != 0 {
					t.Fatalf("expected skip 0, got %d", opts.Skip)
				}
				if _, ok := result.(*[]bson.M); !ok {
					t.Fatalf("result should be *[]bson.M")
				}
				*result.(*[]bson.M) = []bson.M{{"placeid": "p1", "name": "Sunset", "description": "Nice place", "banner": "banner.jpg"}}
				return nil
			}}

			req := httptest.NewRequest(http.MethodGet, "/home/cards?category="+tt.category, nil)
			rec := httptest.NewRecorder()
			handler := HomeCardsHandler(&infra.Deps{DB: mockDB})
			handler(rec, req, nil)

			if called != tt.wantCalled {
				t.Fatalf("expected db called=%t, got %t", tt.wantCalled, called)
			}
			if rec.Code != tt.wantStatus {
				t.Fatalf("expected status %d, got %d", tt.wantStatus, rec.Code)
			}
			if tt.wantErrorContains != "" {
				var payload map[string]any
				if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
					t.Fatalf("decode error: %v", err)
				}
				if got := payload["message"]; got != tt.wantErrorContains {
					t.Fatalf("expected error message %v, got %v", tt.wantErrorContains, got)
				}
				return
			}

			var got []HomeCard
			if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
				t.Fatalf("decode error: %v", err)
			}
			if len(got) != len(tt.wantCards) {
				t.Fatalf("expected %d cards, got %d", len(tt.wantCards), len(got))
			}
			if len(got) > 0 {
				if got[0].Title != tt.wantCards[0].Title || got[0].Description != tt.wantCards[0].Description || got[0].Href != tt.wantCards[0].Href || got[0].Banner != tt.wantCards[0].Banner {
					t.Fatalf("unexpected cards: %#v", got)
				}
			}
		})
	}
}
