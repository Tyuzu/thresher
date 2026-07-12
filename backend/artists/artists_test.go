package artists

import (
	"naevis/models"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestParseArtistFormData_NewAndExisting(t *testing.T) {
	// New artist (no existing)
	body := strings.NewReader("name=Test+Artist&bio=Some+bio&genres=rock,pop&socials={\"twitter\":\"@a\"}")
	req := httptest.NewRequest(http.MethodPost, "/", body)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	artist, updateData, filesToDelete, err := parseArtistFormData(req, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if artist.Name != "Test Artist" {
		t.Fatalf("expected name 'Test Artist', got '%s'", artist.Name)
	}
	if len(artist.Genres) != 2 || artist.Genres[0] != "rock" {
		t.Fatalf("genres not parsed correctly: %v", artist.Genres)
	}
	if _, ok := updateData["socials"]; !ok {
		t.Fatalf("expected socials in updateData")
	}
	if len(filesToDelete) != 0 {
		t.Fatalf("expected no files to delete for form-only request")
	}

	// Existing artist - ensure existing values preserved when form omits them
	existing := &models.Artist{
		ArtistID: "existing123",
		Name:     "Existing Name",
		Genres:   []string{"jazz"},
		Bio:      "old bio",
		Country:  "Neverland",
	}

	body2 := strings.NewReader("name=&bio=New+bio")
	req2 := httptest.NewRequest(http.MethodPost, "/", body2)
	req2.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	artist2, updateData2, _, err := parseArtistFormData(req2, existing)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// name was empty in form so should fall back to existing
	if artist2.Name != "Existing Name" {
		t.Fatalf("expected preserved name, got '%s'", artist2.Name)
	}
	if artist2.Bio != "New bio" {
		t.Fatalf("expected bio to be updated to 'New bio', got '%s'", artist2.Bio)
	}
	if g, ok := updateData2["bio"]; !ok || g != "New bio" {
		t.Fatalf("expected updateData to contain bio update, got %v", updateData2)
	}
}

func TestExistingValue(t *testing.T) {
	var nilArtist *models.Artist
	if v := existingValue(nilArtist, "Name"); v != "" {
		t.Fatalf("expected empty string for nil existing, got '%s'", v)
	}

	a := &models.Artist{Name: "X", Bio: "B", Category: "C", DOB: "D", Place: "P", Country: "Q", Banner: "bn", Photo: "ph"}
	cases := map[string]string{
		"Name":     "X",
		"Bio":      "B",
		"Category": "C",
		"DOB":      "D",
		"Place":    "P",
		"Country":  "Q",
		"Banner":   "bn",
		"Photo":    "ph",
	}
	for field, want := range cases {
		if got := existingValue(a, field); got != want {
			t.Fatalf("existingValue(%s) = %s; want %s", field, got, want)
		}
	}
	// unknown field returns empty
	if got := existingValue(a, "Unknown"); got != "" {
		t.Fatalf("expected empty for unknown field, got %s", got)
	}
}
