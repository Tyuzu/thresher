package usecase

import (
	"testing"

	"naevis/cart/domain"
)

func TestValidateAddToCartRequestRejectsEmptyItem(t *testing.T) {
	_, err := domain.ValidateAddToCartRequest(domain.AddToCartRequest{Category: "food", Quantity: 1})
	if err == nil {
		t.Fatal("expected validation error")
	}
}

func TestValidateAddToCartRequestAcceptsValidItem(t *testing.T) {
	validated, err := domain.ValidateAddToCartRequest(domain.AddToCartRequest{ItemID: "item-1", Category: "food", Quantity: 2})
	if err != nil {
		t.Fatalf("expected valid request, got %v", err)
	}
	if validated.ItemID != "item-1" || validated.Quantity != 2 {
		t.Fatalf("expected valid payload to be preserved, got %#v", validated)
	}
}

func TestValidateUpdateQuantityRequestAllowsPositiveQuantity(t *testing.T) {
	validated, err := domain.ValidateUpdateQuantityRequest(domain.UpdateQuantityRequest{ItemID: "item-1", Category: "food", Quantity: 2})
	if err != nil {
		t.Fatalf("expected valid request, got %v", err)
	}
	if validated.Quantity != 2 {
		t.Fatalf("expected quantity to be 2, got %d", validated.Quantity)
	}
}
