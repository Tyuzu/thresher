package cart

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"

	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/utils"
	log "naevis/utils/logger"
)

const (
	couponTimeout = 5 * time.Second
)

/* ───────────────────────── Coupon Models ───────────────────────── */

func (r CouponRequest) validate() error {
	if strings.TrimSpace(r.Code) == "" {
		return errors.New("coupon code missing")
	}
	if strings.TrimSpace(r.EntityID) == "" || strings.TrimSpace(r.EntityType) == "" {
		return errors.New("entity details required")
	}
	return nil
}

type CouponResponse struct {
	Valid    bool    `json:"valid"`
	Discount float64 `json:"discount"`
	Message  string  `json:"message"`
}

/* ───────────────────────── Coupon Validation (SERVER) ───────────────────────── */

type CouponResult struct {
	DiscountAmount int64
}

type dbCoupon struct {
	Code        string  `bson:"code"`
	Active      bool    `bson:"active"`
	ExpiresAt   int64   `bson:"expiresat"`
	Type        string  `bson:"type"`  // "flat" or "percent"
	Value       float64 `bson:"value"` // ₹ or %
	MaxDiscount float64 `bson:"maxdiscount"`
}

func validateCouponServer(ctx context.Context, code string, subtotal int64, app *infra.Deps) (*CouponResult, error) {
	code = strings.TrimSpace(strings.ToLower(code))
	if code == "" {
		return &CouponResult{DiscountAmount: 0}, nil
	}

	var coupon dbCoupon
	err := app.DB.FindOne(ctx, couponCollection, bson.M{"code": code}, &coupon)
	if err != nil || !coupon.Active {
		return nil, errors.New("invalid coupon")
	}

	if coupon.ExpiresAt > 0 && time.Now().Unix() > coupon.ExpiresAt {
		return nil, errors.New("coupon expired")
	}

	var discount int64
	switch strings.ToLower(coupon.Type) {
	case "flat":
		discount = int64(coupon.Value * 100)

	case "percent":
		raw := float64(subtotal) * (coupon.Value / 100)
		discount = int64(raw)

		if coupon.MaxDiscount > 0 {
			max := int64(coupon.MaxDiscount * 100)
			if discount > max {
				discount = max
			}
		}
	default:
		return nil, fmt.Errorf("unsupported coupon type: %s", coupon.Type)
	}

	if discount > subtotal {
		discount = subtotal
	}

	return &CouponResult{DiscountAmount: discount}, nil
}

/* ───────────────────────── Validate Coupon Handler ───────────────────────── */

// ValidateCouponHandler checks if a coupon code is applicable for an entity and returns calculated discounts.
func ValidateCouponHandler(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req CouponRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			utils.RespondWithJSON(w, http.StatusBadRequest, CouponResponse{
				Valid:   false,
				Message: "Invalid request body",
			})
			return
		}

		if err := req.validate(); err != nil {
			utils.RespondWithJSON(w, http.StatusBadRequest, CouponResponse{
				Valid:   false,
				Message: err.Error(),
			})
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), couponTimeout)
		defer cancel()

		code := strings.TrimSpace(strings.ToLower(req.Code))
		filter := bson.M{
			"code":       code,
			"entityId":   req.EntityID,
			"entityType": strings.ToLower(req.EntityType),
			"active":     true,
		}

		var coupon Coupon
		if err := app.DB.FindOne(ctx, couponCollection, filter, &coupon); err != nil {
			utils.RespondWithJSON(w, http.StatusNotFound, CouponResponse{
				Valid:   false,
				Message: "Coupon not valid for this entity",
			})
			return
		}

		if !coupon.ExpiresAt.IsZero() && time.Now().After(coupon.ExpiresAt) {
			utils.RespondWithJSON(w, http.StatusGone, CouponResponse{
				Valid:   false,
				Message: "Coupon expired",
			})
			return
		}

		discount := 0.0
		if req.Cart > 0 {
			discount = (req.Cart * coupon.Discount) / 100
		}

		if err := mq.PublishWithMeta(ctx, app.MQ, mqevent.CouponValidatedEvent, mqevent.CouponValidatedPayload{}); err != nil {
			log.Printf("ValidateCouponHandler: failed to publish coupon event: %v", err)
		}

		utils.RespondWithJSON(w, http.StatusOK, CouponResponse{
			Valid:    true,
			Discount: discount,
			Message:  "Coupon applied",
		})
	}
}
