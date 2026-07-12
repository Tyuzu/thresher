package recipes

import (
	"naevis/models"
	"testing"
)

// Test splitCSV helper function
func TestSplitCSV(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  []string
	}{
		{"empty string", "", []string{}},
		{"single value", "value1", []string{"value1"}},
		{"multiple values", "value1,value2,value3", []string{"value1", "value2", "value3"}},
		{"with spaces", "  value1  ,  value2  ,  value3  ", []string{"value1", "value2", "value3"}},
		{"trailing comma", "value1,value2,", []string{"value1", "value2", ""}},
		{"single space", " ", []string{""}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := splitCSV(tt.input)
			if len(got) != len(tt.want) {
				t.Errorf("length mismatch: got %d, want %d", len(got), len(tt.want))
				return
			}
			for i, v := range got {
				if v != tt.want[i] {
					t.Errorf("splitCSV[%d] = %q, want %q", i, v, tt.want[i])
				}
			}
		})
	}
}

// Test splitLines helper function
func TestSplitLines(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  []string
	}{
		{"empty string", "", []string{}},
		{"single line", "line1", []string{"line1"}},
		{"multiple lines", "line1\nline2\nline3", []string{"line1", "line2", "line3"}},
		{"with empty lines", "line1\n\nline3", []string{"line1", "line3"}},
		{"with spaces", "  line1  \n  line2  ", []string{"line1", "line2"}},
		{"trailing newline", "line1\nline2\n", []string{"line1", "line2"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := splitLines(tt.input)
			if len(got) != len(tt.want) {
				t.Errorf("length mismatch: got %d, want %d\ngot: %v\nwant: %v", len(got), len(tt.want), got, tt.want)
				return
			}
			for i, v := range got {
				if v != tt.want[i] {
					t.Errorf("splitLines[%d] = %q, want %q", i, v, tt.want[i])
				}
			}
		})
	}
}

// Test getSafe array access function
func TestGetSafe(t *testing.T) {
	arr := []string{"zero", "one", "two"}
	tests := []struct {
		name  string
		index int
		want  string
	}{
		{"valid index 0", 0, "zero"},
		{"valid index 1", 1, "one"},
		{"valid index 2", 2, "two"},
		{"out of bounds positive", 5, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := getSafe(arr, tt.index)
			if got != tt.want {
				t.Errorf("getSafe(%d) = %q, want %q", tt.index, got, tt.want)
			}
		})
	}
}

// Test normalizeRecipeSlices function
func TestNormalizeRecipeSlices(t *testing.T) {
	t.Run("nil slices initialized", func(t *testing.T) {
		recipe := &models.Recipe{
			Dietary:     nil,
			Tags:        nil,
			Steps:       nil,
			Images:      nil,
			Ingredients: nil,
		}
		normalizeRecipeSlices(recipe)

		if recipe.Dietary == nil {
			t.Errorf("Dietary should be initialized, got nil")
		}
		if recipe.Tags == nil {
			t.Errorf("Tags should be initialized, got nil")
		}
		if recipe.Steps == nil {
			t.Errorf("Steps should be initialized, got nil")
		}
		if recipe.Images == nil {
			t.Errorf("Images should be initialized, got nil")
		}
		if recipe.Ingredients == nil {
			t.Errorf("Ingredients should be initialized, got nil")
		}
	})

	t.Run("existing slices preserved", func(t *testing.T) {
		recipe := &models.Recipe{
			Dietary: []string{"vegan"},
			Tags:    []string{"quick"},
		}
		normalizeRecipeSlices(recipe)

		if len(recipe.Dietary) != 1 || recipe.Dietary[0] != "vegan" {
			t.Errorf("Dietary slice should be preserved")
		}
		if len(recipe.Tags) != 1 || recipe.Tags[0] != "quick" {
			t.Errorf("Tags slice should be preserved")
		}
	})

	t.Run("ingredient alternatives initialized", func(t *testing.T) {
		recipe := &models.Recipe{
			Ingredients: []models.Ingredient{
				{Name: "flour", Alternatives: nil},
			},
		}
		normalizeRecipeSlices(recipe)

		if recipe.Ingredients[0].Alternatives == nil {
			t.Errorf("Ingredient alternatives should be initialized")
		}
	})
}
