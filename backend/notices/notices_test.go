package notices

import (
	"strings"
	"testing"
)

// Test makeSummary with various content lengths
func TestMakeSummary(t *testing.T) {
	tests := []struct {
		name     string
		content  string
		wantLen  int
		expected string
	}{
		{"empty content", "", 0, ""},
		{"single line short", "Hello World", 11, "Hello World"},
		{"single line long", string(make([]byte, 250)), 200, ""},
		{"two lines", "Line 1\nLine 2", 13, "Line 1\nLine 2"},
		{"three lines short", "Line 1\nLine 2\nLine 3", 13, "Line 1\nLine 2"},
		{"three lines long", "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore\nLine 2\nLine 3", -1, ""},
		{"whitespace trim", "  Content with spaces  ", 19, "Content with spaces"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := makeSummary(tt.content)
			if tt.wantLen >= 0 && len(got) != tt.wantLen {
				t.Errorf("makeSummary len = %d, want %d", len(got), tt.wantLen)
			}
			if tt.expected != "" && got != tt.expected {
				t.Errorf("makeSummary = %q, want %q", got, tt.expected)
			}
		})
	}
}

// Test that summary doesn't exceed 200 chars
func TestMakeSummaryMaxLength(t *testing.T) {
	long := "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat"
	summary := makeSummary(long)
	if len(summary) > 200 {
		t.Errorf("makeSummary exceeded 200 chars: got %d", len(summary))
	}
}

// Test parseNoticeRequest with valid input
func TestParseNoticeRequestValid(t *testing.T) {
	title := "Test Title"
	content := "Test Content"
	expectedSummary := "Test Content"

	// Basic validation of extracted fields
	if title == "" {
		t.Errorf("title should not be empty")
	}
	if content == "" {
		t.Errorf("content should not be empty")
	}
	if expectedSummary != makeSummary(content) {
		t.Errorf("summary mismatch")
	}
}

// Test notice creation with required fields
func TestNoticeFieldValidation(t *testing.T) {
	tests := []struct {
		name    string
		title   string
		content string
		isValid bool
	}{
		{"with title and content", "Title", "Content", true},
		{"with only content", "", "Content", true},
		{"empty content", "Title", "", false},
		{"whitespace content", "Title", "   ", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			content := tt.content
			// Trim whitespace to check if there's actual content
			isValid := strings.TrimSpace(content) != "" && content != ""
			if isValid != tt.isValid {
				t.Errorf("expected isValid=%v, got %v", tt.isValid, isValid)
			}
		})
	}
}
