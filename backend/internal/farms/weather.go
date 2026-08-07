package farms

import (
	"net/http"

	"naevis/infra"
	"naevis/utils"
)

func GetWeather(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {

		response := WeatherResponse{
			Location:  "Farm — NYC",
			Icon:      "🌤️",
			AirTemp:   28.6,
			Humidity:  65,
			WindSpeed: 12,
			SoilTemp:  22.3,
			Rain24h:   2,
		}

		utils.RespondWithJSON(w, http.StatusOK, response)
	}
}
