package domain

import (
	"fmt"
	"strings"
)

type AddToCartRequest struct {
	ItemID     string `json:"itemid"`
	Category   string `json:"category"`
	Quantity   int    `json:"quantity"`
	EntityID   string `json:"entityid,omitempty"`
	EntityType string `json:"entitytype,omitempty"`
}

func ValidateAddToCartRequest(req AddToCartRequest) (AddToCartRequest, error) {
	req.ItemID = strings.TrimSpace(req.ItemID)
	req.Category = strings.TrimSpace(req.Category)
	req.EntityID = strings.TrimSpace(req.EntityID)
	req.EntityType = strings.TrimSpace(req.EntityType)

	if req.ItemID == "" {
		return AddToCartRequest{}, fmt.Errorf("item id is required")
	}
	if req.Quantity <= 0 {
		return AddToCartRequest{}, fmt.Errorf("quantity must be greater than zero")
	}
	if req.Category == "" {
		return AddToCartRequest{}, fmt.Errorf("category is required")
	}
	return req, nil
}

type UpdateQuantityRequest struct {
	ItemID     string `json:"itemid"`
	Category   string `json:"category"`
	Quantity   int    `json:"quantity"`
	EntityID   string `json:"entityid,omitempty"`
	EntityType string `json:"entitytype,omitempty"`
}

func ValidateUpdateQuantityRequest(req UpdateQuantityRequest) (UpdateQuantityRequest, error) {
	req.ItemID = strings.TrimSpace(req.ItemID)
	req.Category = strings.TrimSpace(req.Category)
	req.EntityID = strings.TrimSpace(req.EntityID)
	req.EntityType = strings.TrimSpace(req.EntityType)

	if req.ItemID == "" {
		return UpdateQuantityRequest{}, fmt.Errorf("item id is required")
	}
	if req.Category == "" {
		return UpdateQuantityRequest{}, fmt.Errorf("category is required")
	}
	if req.Quantity <= 0 {
		return UpdateQuantityRequest{}, fmt.Errorf("quantity must be greater than zero")
	}
	return req, nil
}

type RemoveFromCartRequest struct {
	ItemID     string `json:"itemid"`
	Category   string `json:"category"`
	EntityID   string `json:"entityid,omitempty"`
	EntityType string `json:"entitytype,omitempty"`
}

func ValidateRemoveFromCartRequest(req RemoveFromCartRequest) (RemoveFromCartRequest, error) {
	req.ItemID = strings.TrimSpace(req.ItemID)
	req.Category = strings.TrimSpace(req.Category)
	req.EntityID = strings.TrimSpace(req.EntityID)
	req.EntityType = strings.TrimSpace(req.EntityType)

	if req.ItemID == "" {
		return RemoveFromCartRequest{}, fmt.Errorf("item id is required")
	}
	if req.Category == "" {
		return RemoveFromCartRequest{}, fmt.Errorf("category is required")
	}
	return req, nil
}
