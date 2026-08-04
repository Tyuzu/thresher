package cart

import (
	"net/http"

	"naevis/infra"
)

func UpdateCart(app *infra.Deps) http.HandlerFunc {
	return NewCartHandler(app).UpdateCart()
}

func UpdateItemQuantity(app *infra.Deps) http.HandlerFunc {
	return NewCartHandler(app).UpdateItemQuantity()
}
