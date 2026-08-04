package pay

import "net/http"

func (p *PaymentService) CashOnDelivery(w http.ResponseWriter, r *http.Request) {
	p.uc.CashOnDelivery(w, r)
}
