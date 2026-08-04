package pay

import "net/http"

func (p *PaymentService) Transfer(w http.ResponseWriter, r *http.Request) {
	p.uc.Transfer(w, r)
}
