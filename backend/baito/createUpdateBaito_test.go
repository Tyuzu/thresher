package baito

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestParseBaitoRequestIncludesDeadlineAndDuration(t *testing.T) {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	fields := map[string]string{
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
	}

	for key, value := range fields {
		if err := writer.WriteField(key, value); err != nil {
			t.Fatalf("write field %s: %v", key, err)
		}
	}

	if err := writer.Close(); err != nil {
		t.Fatalf("close writer: %v", err)
	}

	req := httptest.NewRequest("POST", "/baitos/baito", strings.NewReader(body.String()))
	req.Header.Set("Content-Type", writer.FormDataContentType())

	parsed, err := ParseBaitoRequest(req)
	if err != nil {
		t.Fatalf("ParseBaitoRequest() error = %v", err)
	}

	if parsed.Duration != "2 weeks" {
		t.Fatalf("expected duration to be parsed, got %q", parsed.Duration)
	}

	if parsed.LastDateToApply != "2026-08-01" {
		t.Fatalf("expected lastDateToApply to be parsed, got %q", parsed.LastDateToApply)
	}

	if err := parsed.Validate(); err != nil {
		t.Fatalf("Validate() error = %v", err)
	}

	model := parsed.ToModel("user-1")
	if model.LastDateToApply == nil || model.LastDateToApply.IsZero() {
		t.Fatalf("expected model deadline to be populated")
	}

	if model.Duration != "2 weeks" {
		t.Fatalf("expected model duration to be preserved, got %q", model.Duration)
	}

	if !model.LastDateToApply.Equal(time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC)) {
		t.Fatalf("expected deadline to be 2026-08-01 UTC, got %v", model.LastDateToApply)
	}
}

func TestToModelOmitsEmptyDeadlineFromJSON(t *testing.T) {
	req := BaitoRequest{
		Title:        "Warehouse Helper",
		Description:  "Need help moving stock",
		Category:     "Logistics",
		SubCategory:  "Warehouse",
		Location:     "Nairobi",
		Wage:         "15",
		Phone:        "0712345678",
		Requirements: "Reliable",
		WorkHours:    "9-5",
	}

	model := req.ToModel("user-1")
	if model.LastDateToApply != nil {
		t.Fatalf("expected empty deadline to stay nil, got %v", model.LastDateToApply)
	}

	payload, err := json.Marshal(model)
	if err != nil {
		t.Fatalf("Marshal() error = %v", err)
	}

	if strings.Contains(string(payload), "lastdate") {
		t.Fatalf("expected empty deadline to be omitted from JSON, got %s", payload)
	}
}
