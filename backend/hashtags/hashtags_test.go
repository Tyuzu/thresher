package hashtags

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/julienschmidt/httprouter"
)

func TestHashtagHandlers(t *testing.T) {
	tests := []struct {
		name         string
		handler      func(http.ResponseWriter, *http.Request, httprouter.Params)
		params       httprouter.Params
		query        string
		wantStatus   int
		wantLen      int
		wantTag      string
		wantContains string
		isPeople     bool
	}{
		{
			name:         "get hashtag posts requires tag",
			handler:      GetHashtagPosts,
			wantStatus:   http.StatusBadRequest,
			wantContains: "Missing tag parameter",
		},
		{
			name:       "get hashtag posts returns paginated posts",
			handler:    GetHashtagPosts,
			params:     httprouter.Params{{Key: "tag", Value: "nature"}},
			query:      "page=0&limit=2",
			wantStatus: http.StatusOK,
			wantLen:    2,
			wantTag:    "nature",
		},
		{
			name:       "get top hashtag posts delegates to posts handler",
			handler:    GetTopHashtagPosts,
			params:     httprouter.Params{{Key: "tag", Value: "travel"}},
			query:      "page=0&limit=1",
			wantStatus: http.StatusOK,
			wantLen:    1,
			wantTag:    "travel",
		},
		{
			name:       "get latest hashtag posts delegates to posts handler",
			handler:    GetLatestHashtagPosts,
			params:     httprouter.Params{{Key: "tag", Value: "music"}},
			query:      "page=0&limit=3",
			wantStatus: http.StatusOK,
			wantLen:    3,
			wantTag:    "music",
		},
		{
			name:         "get hashtag people requires tag",
			handler:      GetHashtagPeople,
			wantStatus:   http.StatusBadRequest,
			wantContains: "Missing tag parameter",
		},
		{
			name:       "get hashtag people returns paginated people",
			handler:    GetHashtagPeople,
			params:     httprouter.Params{{Key: "tag", Value: "tech"}},
			query:      "page=0&limit=2",
			wantStatus: http.StatusOK,
			wantLen:    2,
			isPeople:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/hashtags", nil)
			if tt.query != "" {
				req.URL.RawQuery = tt.query
			}
			rec := httptest.NewRecorder()
			tt.handler(rec, req, tt.params)

			if rec.Code != tt.wantStatus {
				t.Fatalf("expected status %d, got %d", tt.wantStatus, rec.Code)
			}
			if tt.wantContains != "" {
				if body := rec.Body.String(); body == "" || body == "null" || body == "{}" {
					t.Fatalf("expected error body, got %q", body)
				}
				if body := rec.Body.String(); body == "" || !contains(body, tt.wantContains) {
					t.Fatalf("expected response to contain %q, got %q", tt.wantContains, rec.Body.String())
				}
				return
			}

			var payload []HashtagPost
			if tt.isPeople {
				var people []Person
				if err := json.NewDecoder(rec.Body).Decode(&people); err != nil {
					t.Fatalf("decode people error: %v", err)
				}
				if len(people) != tt.wantLen {
					t.Fatalf("expected %d people, got %d", tt.wantLen, len(people))
				}
				return
			}

			if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
				t.Fatalf("decode posts error: %v", err)
			}
			if len(payload) != tt.wantLen {
				t.Fatalf("expected %d posts, got %d", tt.wantLen, len(payload))
			}
			if tt.wantTag != "" && len(payload) > 0 && payload[0].Tags[0] != tt.wantTag {
				t.Fatalf("expected first tag %q, got %q", tt.wantTag, payload[0].Tags[0])
			}
		})
	}
}

func TestTrendingHashtagsHandler(t *testing.T) {
	tests := []struct {
		name       string
		query      string
		wantStatus int
		wantLen    int
	}{
		{name: "returns default list", wantStatus: http.StatusOK, wantLen: 5},
		{name: "respects limit query", query: "limit=2", wantStatus: http.StatusOK, wantLen: 2},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/hashtags/trending", nil)
			if tt.query != "" {
				req.URL.RawQuery = tt.query
			}
			rec := httptest.NewRecorder()
			GetTrendingHashtags(rec, req, nil)

			if rec.Code != tt.wantStatus {
				t.Fatalf("expected status %d, got %d", tt.wantStatus, rec.Code)
			}
			var payload []TrendingHashtag
			if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
				t.Fatalf("decode trending error: %v", err)
			}
			if len(payload) != tt.wantLen {
				t.Fatalf("expected %d hashtags, got %d", tt.wantLen, len(payload))
			}
		})
	}
}

func contains(s, substr string) bool {
	return strings.Contains(s, substr)
}
