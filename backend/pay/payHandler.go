package pay

import "net/http"

func (p *PaymentService) Pay(w http.ResponseWriter, r *http.Request) { p.uc.Pay(w, r) }
