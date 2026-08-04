package pay

import (
	"context"
	"net/http"
)

func (p *PaymentService) CreateWallet(w http.ResponseWriter, r *http.Request) {
	p.uc.CreateWallet(w, r)
}

func (p *PaymentService) GetAccountStrict(ctx context.Context, userID string) (string, error) {
	return p.uc.GetAccountStrict(ctx, userID)
}
