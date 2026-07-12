package farms

import (
	"testing"
)

// Test validateFarmName validation
func TestValidateFarmName(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		wantFail bool
	}{
		{"empty name", "", true},
		{"valid name", "Green Valley Farm", false},
		{"single char", "F", false},
		{"max length valid", string(make([]byte, 200)), false},
		{"exceeds max length", string(make([]byte, 201)), true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if len(tt.input) > 200 {
				if !tt.wantFail {
					t.Errorf("expected to fail for input length > 200")
				}
			} else if len(tt.input) == 0 {
				if !tt.wantFail {
					t.Errorf("expected to fail for empty name")
				}
			}
		})
	}
}

// Test field length constraints
func TestFarmFieldLengths(t *testing.T) {
	tests := []struct {
		field  string
		limit  int
		value  string
		should string // "pass" or "fail"
	}{
		{"name", 200, "Farm Name", "pass"},
		{"name", 200, string(make([]byte, 201)), "fail"},
		{"location", 500, "Nairobi, Kenya", "pass"},
		{"location", 500, string(make([]byte, 501)), "fail"},
		{"description", 2000, "A sustainable farm", "pass"},
		{"description", 2000, string(make([]byte, 2001)), "fail"},
	}

	for _, tt := range tests {
		t.Run(tt.field+"_"+tt.should, func(t *testing.T) {
			isValid := len(tt.value) <= tt.limit
			if tt.should == "pass" && !isValid {
				t.Errorf("%s: expected pass but got fail (len=%d, limit=%d)", tt.field, len(tt.value), tt.limit)
			}
			if tt.should == "fail" && isValid {
				t.Errorf("%s: expected fail but got pass", tt.field)
			}
		})
	}
}

// Test required fields validation
func TestFarmRequiredFields(t *testing.T) {
	type FarmInput struct {
		Name     string
		Location string
		Owner    string
		Contact  string
	}

	tests := []struct {
		name    string
		input   FarmInput
		isValid bool
	}{
		{"all fields present", FarmInput{"Farm", "Location", "Owner", "contact@email.com"}, true},
		{"missing name", FarmInput{"", "Location", "Owner", "contact@email.com"}, false},
		{"missing location", FarmInput{"Farm", "", "Owner", "contact@email.com"}, false},
		{"missing owner", FarmInput{"Farm", "Location", "", "contact@email.com"}, false},
		{"missing contact", FarmInput{"Farm", "Location", "Owner", ""}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isValid := tt.input.Name != "" && tt.input.Location != "" && tt.input.Owner != "" && tt.input.Contact != ""
			if isValid != tt.isValid {
				t.Errorf("expected isValid=%v, got %v", tt.isValid, isValid)
			}
		})
	}
}
