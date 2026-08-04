package cart

import (
	"net/http"

	"naevis/infra"
)

func InitiateCheckout(app *infra.Deps) http.HandlerFunc {
	return NewCartHandler(app).InitiateCheckout()
}

func CreateCheckoutSession(app *infra.Deps) http.HandlerFunc {
	return NewCartHandler(app).CreateCheckoutSession()
}
