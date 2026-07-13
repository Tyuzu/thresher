package filemgr

import (
	"context"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"naevis/infra"
	"naevis/infra/mq"

	"github.com/julienschmidt/httprouter"
)

type stubMQ struct{}

type stubSubscription struct{}

func (stubMQ) Publish(context.Context, string, []byte) error { return nil }
func (stubMQ) Ping(context.Context) error                    { return nil }
func (stubMQ) Subscribe(context.Context, string, mq.MessageHandler) (mq.Subscription, error) {
	return stubSubscription{}, nil
}
func (stubMQ) QueueSubscribe(context.Context, string, string, mq.MessageHandler) (mq.Subscription, error) {
	return stubSubscription{}, nil
}
func (stubSubscription) Unsubscribe() error { return nil }

func TestOptionsHandler(t *testing.T) {
	tests := []struct {
		name string
	}{
		{name: "sets cors headers"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodOptions, "/", nil)
			rr := httptest.NewRecorder()

			OptionsHandler(rr, req, nil)

			if rr.Code != http.StatusNoContent {
				t.Fatalf("expected status %d, got %d", http.StatusNoContent, rr.Code)
			}
			if got := rr.Header().Get("Access-Control-Allow-Origin"); got != "*" {
				t.Fatalf("expected allow origin header *, got %q", got)
			}
			if got := rr.Header().Get("Access-Control-Allow-Methods"); got != "GET, POST, PUT, DELETE, OPTIONS" {
				t.Fatalf("unexpected allow methods header %q", got)
			}
			if got := rr.Header().Get("Access-Control-Allow-Headers"); got != "Content-Type, Authorization" {
				t.Fatalf("unexpected allow headers header %q", got)
			}
		})
	}
}

func TestProxyHandler(t *testing.T) {
	tests := []struct {
		name       string
		url        string
		wantStatus int
		blockHost  string
	}{
		{name: "invalid URL", url: "http://", wantStatus: http.StatusBadRequest},
		{name: "unsupported scheme", url: "ftp://example.com", wantStatus: http.StatusBadRequest},
		{name: "blocked host", url: "http://example.com", wantStatus: http.StatusForbidden, blockHost: "example.com"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			DomainBlocklist = map[string]bool{}
			if tt.blockHost != "" {
				DomainBlocklist[tt.blockHost] = true
			}

			req := httptest.NewRequest(http.MethodGet, "/proxy", nil)
			rr := httptest.NewRecorder()
			params := httprouter.Params{{Key: "url", Value: tt.url}}

			ProxyHandler(rr, req, params)

			if rr.Code != tt.wantStatus {
				t.Fatalf("expected status %d, got %d", tt.wantStatus, rr.Code)
			}
		})
	}
}

func TestHandleMediaUpload(t *testing.T) {
	tests := []struct {
		name      string
		postType  string
		setupReq  func(*http.Request)
		wantError bool
	}{
		{
			name:      "unsupported post type",
			postType:  "unsupported",
			setupReq:  func(r *http.Request) {},
			wantError: false,
		},
		{
			name:     "image upload without files",
			postType: "image",
			setupReq: func(r *http.Request) {
				r.MultipartForm = &multipart.Form{File: map[string][]*multipart.FileHeader{}}
			},
			wantError: true,
		},
		{
			name:     "video upload without files",
			postType: "video",
			setupReq: func(r *http.Request) {
				r.MultipartForm = &multipart.Form{File: map[string][]*multipart.FileHeader{}}
			},
			wantError: true,
		},
		{
			name:     "audio upload without files",
			postType: "audio",
			setupReq: func(r *http.Request) {
				r.MultipartForm = &multipart.Form{File: map[string][]*multipart.FileHeader{}}
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/media", nil)
			tt.setupReq(req)

			paths, names, resolutions, err := HandleMediaUpload(req, tt.postType, EntityUser, "user-1")
			if tt.wantError && err == nil {
				t.Fatalf("expected an error, got nil")
			}
			if !tt.wantError && err != nil {
				t.Fatalf("expected no error, got %v", err)
			}
			if len(paths) != 0 {
				t.Fatalf("expected no paths, got %v", paths)
			}
			if len(names) != 0 {
				t.Fatalf("expected no names, got %v", names)
			}
			if len(resolutions) != 0 {
				t.Fatalf("expected no resolutions, got %v", resolutions)
			}
		})
	}
}

func TestFiledropHandler(t *testing.T) {
	tests := []struct {
		name        string
		method      string
		contentType string
		query       map[string]string
		wantStatus  int
	}{
		{name: "rejects non-post method", method: http.MethodGet, wantStatus: http.StatusBadRequest},
		{name: "requires entity type", method: http.MethodPost, contentType: "multipart/form-data; boundary=test", wantStatus: http.StatusBadRequest},
		{name: "rejects invalid entity type", method: http.MethodPost, contentType: "multipart/form-data; boundary=test", query: map[string]string{"entityType": "invalid"}, wantStatus: http.StatusBadRequest},
		{name: "requires remote key for remote upload", method: http.MethodPost, contentType: "multipart/form-data; boundary=test", query: map[string]string{"entityType": "artist", "remoteUrl": "https://example.com/file.jpg"}, wantStatus: http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, "/filedrop", nil)
			if tt.contentType != "" {
				req.Header.Set("Content-Type", tt.contentType)
			}
			q := req.URL.Query()
			for key, value := range tt.query {
				q.Set(key, value)
			}
			req.URL.RawQuery = q.Encode()

			rr := httptest.NewRecorder()
			app := &infra.Deps{MQ: stubMQ{}}

			FiledropHandler(app)(rr, req, nil)

			if rr.Code != tt.wantStatus {
				t.Fatalf("expected status %d, got %d", tt.wantStatus, rr.Code)
			}
		})
	}
}
