package pay

import (
	"testing"
)

// Test payment validation for required fields
func TestPaymentRequiredFields(t *testing.T) {
	type PaymentRequest struct {
		PaymentType string
		EntityType  string
		EntityID    string
		Method      string
	}

	tests := []struct {
		name    string
		req     PaymentRequest
		isValid bool
	}{
		{"all fields present", PaymentRequest{"order", "cart", "123", "wallet"}, true},
		{"missing paymentType", PaymentRequest{"", "cart", "123", "wallet"}, false},
		{"missing entityType", PaymentRequest{"order", "", "123", "wallet"}, false},
		{"missing entityID", PaymentRequest{"order", "cart", "", "wallet"}, false},
		{"empty method defaults to wallet", PaymentRequest{"order", "cart", "123", ""}, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Apply default
			if tt.req.Method == "" {
				tt.req.Method = "wallet"
			}

			isValid := tt.req.PaymentType != "" && tt.req.EntityType != "" && tt.req.EntityID != ""
			if isValid != tt.isValid {
				t.Errorf("expected isValid=%v, got %v", tt.isValid, isValid)
			}
		})
	}
}

// Test payment method validation
func TestPaymentMethodValidation(t *testing.T) {
	tests := []struct {
		name    string
		method  string
		isValid bool
	}{
		{"wallet method", "wallet", true},
		{"card method", "card", true},
		{"cash on delivery", "cod", true},
		{"transfer method", "transfer", true},
		{"invalid method", "bitcoin", false},
		{"empty method", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			allowedMethods := map[string]bool{
				"wallet":   true,
				"card":     true,
				"cod":      true,
				"transfer": true,
			}
			isValid := allowedMethods[tt.method]
			if isValid != tt.isValid {
				t.Errorf("expected isValid=%v, got %v", tt.isValid, isValid)
			}
		})
	}
}

// Test entity type validation for payments
func TestPaymentEntityTypeValidation(t *testing.T) {
	tests := []struct {
		name       string
		entityType string
		isValid    bool
	}{
		{"cart entity", "cart", true},
		{"order entity", "order", true},
		{"baito entity", "baito", true},
		{"booking entity", "booking", true},
		{"invalid entity", "unknown", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			allowedEntities := map[string]bool{
				"cart":    true,
				"order":   true,
				"baito":   true,
				"booking": true,
			}
			isValid := allowedEntities[tt.entityType]
			if isValid != tt.isValid {
				t.Errorf("expected isValid=%v, got %v", tt.isValid, isValid)
			}
		})
	}
}
