package pay

import "net/http"

func (p *PaymentService) HandlePaymentWebhook(w http.ResponseWriter, r *http.Request) {
	p.uc.HandlePaymentWebhook(w, r)
}
