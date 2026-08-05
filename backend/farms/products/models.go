package products

type OrderDisplay struct {
	ID           string `json:"id"`
	Buyer        string `json:"buyer"`
	Farm         string `json:"farm"`
	Contact      string `json:"contact"`
	Crop         string `json:"crop"`
	CropID       string `json:"cropId"`
	Qty          int    `json:"qty"`
	Unit         string `json:"unit"`
	OrderDate    string `json:"orderDate"`
	DeliveryDate string `json:"deliveryDate"`
	Address      string `json:"address"`
	Payment      string `json:"payment"`
	Status       string `json:"status"`
}

type BulkOrdersRequest struct {
	OrderIDs []string `json:"orderIds"`
}

type BulkOrdersResponse struct {
	Success bool     `json:"success"`
	Message string   `json:"message"`
	Updated int      `json:"updated"`
	Failed  int      `json:"failed"`
	Errors  []string `json:"errors,omitempty"`
}
