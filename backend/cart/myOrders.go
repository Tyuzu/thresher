package cart

import (
	"net/http"

	"naevis/infra"
)

func GetMyOrders(app *infra.Deps) http.HandlerFunc {
	return NewCartHandler(app).GetMyOrders()
}
