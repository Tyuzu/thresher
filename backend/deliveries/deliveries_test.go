package deliveries

import (
	"testing"
	"time"

	"naevis/models"
)

func TestBuildDeliveryFromOrder(t *testing.T) {
	order := models.Order{
		OrderID:   "ord-001",
		UserID:    "user-1",
		Address:   "Warehouse A -> 42 Main Street",
		Status:    "pending",
		Total:     2500,
		CreatedAt: time.Date(2026, 7, 8, 10, 0, 0, 0, time.UTC),
	}

	delivery := buildDeliveryFromOrder(order)

	if delivery.ID != "ord-001" {
		t.Fatalf("expected delivery id to be ord-001, got %s", delivery.ID)
	}

	if delivery.Pickup != "Warehouse A" {
		t.Fatalf("expected pickup to be parsed from address, got %s", delivery.Pickup)
	}

	if delivery.Dropoff != "42 Main Street" {
		t.Fatalf("expected dropoff to be parsed from address, got %s", delivery.Dropoff)
	}

	if delivery.Status != "Pending" {
		t.Fatalf("expected normalized status, got %s", delivery.Status)
	}
}
