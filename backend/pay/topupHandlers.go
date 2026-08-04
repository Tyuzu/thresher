package pay

import "net/http"

func (p *PaymentService) TopUp(w http.ResponseWriter, r *http.Request) { p.uc.TopUp(w, r) }
