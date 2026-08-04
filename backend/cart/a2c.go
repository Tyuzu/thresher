package cart

import (
	"net/http"

	"naevis/infra"
)

func AddToCart(app *infra.Deps) http.HandlerFunc {
	return NewCartHandler(app).AddToCart()
}
