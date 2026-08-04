package cart

import (
	"errors"
	"net/http"
	"strings"

	"naevis/infra"
)

type CouponResponse struct {
	Valid    bool    `json:"valid"`
	Discount float64 `json:"discount"`
	Message  string  `json:"message"`
}

func (r CouponRequest) validate() error {
	if strings.TrimSpace(r.Code) == "" {
		return errors.New("coupon code missing")
	}
	if strings.TrimSpace(r.EntityID) == "" || strings.TrimSpace(r.EntityType) == "" {
		return errors.New("entity details required")
	}
	return nil
}

func ValidateCouponHandler(app *infra.Deps) http.HandlerFunc {
	return NewCartHandler(app).ValidateCouponHandler()
}
