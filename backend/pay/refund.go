package pay

import "net/http"

func (p *PaymentService) Refund(w http.ResponseWriter, r *http.Request) {
	p.uc.Refund(w, r)
}
