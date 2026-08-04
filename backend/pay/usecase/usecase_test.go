package usecase
package usecase

import (
	"testing"

	"naevis/pay/domain"
)

func TestPaymentRequest_ValidateRejectsInvalidPayload(t *testing.T) {
	_, err := domain.ValidatePaymentRequest(domain.PaymentRequest{})
	if err == nil {
		t.Fatal("expected validation error for empty payment request")
	}
}

func TestPaymentRequest_ValidateAllowsWalletPurchase(t *testing.T) {
	req := domain.PaymentRequest{PaymentType: "purchase", EntityType: "ticket", EntityID: "ticket-1", Method: "wallet", Amount: 1500}
	if _, err := domain.ValidatePaymentRequest(req); err != nil {
		t.Fatalf("expected valid payment request, got %v", err)
	}
}
