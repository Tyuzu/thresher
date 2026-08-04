package cart

import (
	"net/http"

	"naevis/infra"
)

func GetCart(app *infra.Deps) http.HandlerFunc {
	return NewCartHandler(app).GetCart()
}
