package cart

import (
	"net/http"

	"naevis/infra"
)

func PlaceOrder(app *infra.Deps) http.HandlerFunc {
	return NewCartHandler(app).PlaceOrder()
}
