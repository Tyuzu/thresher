package domain

import (
	"context"

	"naevis/models"
)

type ItemDetails struct {
	Name       string
	Type       string
	Category   string
	Price      float64
	Discount   float64
	Unit       string
	EntityID   string
	EntityName string
	EntityType string
	Available  int
}

type CouponResult struct {
	DiscountAmount int64
}

type Coupon struct {
	Code        string
	Type        string
	Value       float64
	MaxDiscount float64
	ExpiresAt   int64
	Active      bool
	EntityID    string
	EntityType  string
}

type CartRepository interface {
	GetCartItems(ctx context.Context, userID string) ([]models.CartItem, error)
	ReplaceCartItems(ctx context.Context, userID string, docs []any) error
	UpsertCartItem(ctx context.Context, userID string, item models.CartItem) error
	UpdateCartItemQuantity(ctx context.Context, userID, itemID, category string, quantity int, entityID, entityType string) error
	DeleteCartItem(ctx context.Context, userID, itemID, category, entityID, entityType string) error
	ClearCart(ctx context.Context, userID string) error
}

type ItemRepository interface {
	LookupItemDetails(ctx context.Context, itemID string) (*ItemDetails, error)
}

type CouponRepository interface {
	ValidateCoupon(ctx context.Context, code string, subtotal int64) (*CouponResult, error)
	FindCouponForEntity(ctx context.Context, code, entityID, entityType string) (Coupon, error)
}

type OrderRepository interface {
	FetchUserOrders(ctx context.Context, userID string) ([]models.Order, []models.FarmOrder, error)
	CreateOrder(ctx context.Context, order models.Order) error
	CreateFarmOrder(ctx context.Context, order models.FarmOrder) error
}

type TransactionRepository interface {
	FindTransactionsByOrderIDs(ctx context.Context, orderIDs []string) (map[string]models.Transaction, error)
}

type UserRepository interface {
	FindUsersByIDs(ctx context.Context, ids []string) (map[string]string, error)
	FindUserByID(ctx context.Context, userID string) (models.User, error)
}
