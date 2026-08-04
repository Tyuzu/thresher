package cart

import (
	"net/http"

	"naevis/infra"
)

func RemoveFromCart(app *infra.Deps) http.HandlerFunc {
	return NewCartHandler(app).RemoveFromCart()
}

func ClearCart(app *infra.Deps) http.HandlerFunc {
	return NewCartHandler(app).ClearCart()
}
