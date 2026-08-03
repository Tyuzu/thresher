package models

type WeatherResponse struct {
	Location  string  `json:"location"`
	Icon      string  `json:"icon"`
	AirTemp   float64 `json:"airtemp"`
	Humidity  int     `json:"humidity"`
	WindSpeed float64 `json:"windspeed"`
	SoilTemp  float64 `json:"soiltemp"`
	Rain24h   float64 `json:"rain24h"`
}
