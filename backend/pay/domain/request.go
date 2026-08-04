package domain
package domain

import (
	"fmt"
	"strings"
)

const (
	PaymentTypeFunding  = "funding"
	PaymentTypeDonation = "donation"
	PaymentTypePurchase = "purchase"
)

type PaymentRequest struct {
	PaymentType string `json:"paymenttype"`
	EntityType  string `json:"entitytype"`
	EntityID    string `json:"entityid"`
	Method      string `json:"method"`
	Amount      int64  `json:"amount,omitempty"`
}

func ValidatePaymentRequest(req PaymentRequest) (PaymentRequest, error) {
	req.PaymentType = strings.TrimSpace(req.PaymentType)
	req.EntityType = strings.TrimSpace(req.EntityType)
	req.EntityID = strings.TrimSpace(req.EntityID)
	req.Method = strings.TrimSpace(req.Method)

	if req.PaymentType == "" {
		return PaymentRequest{}, fmt.Errorf("payment type is required")
	}
	if req.EntityType == "" {
		return PaymentRequest{}, fmt.Errorf("entity type is required")
	}
	if req.EntityID == "" {
		return PaymentRequest{}, fmt.Errorf("entity id is required")
	}
	if req.Method == "" {
		req.Method = "wallet"
	}

	switch req.PaymentType {
	case PaymentTypeFunding, PaymentTypeDonation, PaymentTypePurchase:
	default:
		return PaymentRequest{}, fmt.Errorf("invalid payment type: %s", req.PaymentType)
	}

	switch req.Method {
	case "wallet", "card", "upi", "cod", "transfer":
	default:
		return PaymentRequest{}, fmt.Errorf("invalid payment method: %s", req.Method)
	}

	switch req.EntityType {
	case "order", "cart", "ticket", "menu", "service", "product", "booking", "merch", "crop", "farm", "beat", "post", "artist":
	default:
		return PaymentRequest{}, fmt.Errorf("unsupported entity type: %s", req.EntityType)
	}

	if req.Amount < 0 {
		return PaymentRequest{}, fmt.Errorf("amount cannot be negative")
	}

	return req, nil
}
