package pay

import "net/http"

func (p *PaymentService) ListTransactions(w http.ResponseWriter, r *http.Request) {
	p.uc.ListTransactions(w, r)
}
func (p *PaymentService) GetBalance(w http.ResponseWriter, r *http.Request) { p.uc.GetBalance(w, r) }
