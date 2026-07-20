package farms

import "time"

/* ---------------------------------------------------- */
/* DTOs                                                 */
/* ---------------------------------------------------- */

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

type TopCrop struct {
	Name     string  `json:"name"`
	Quantity int     `json:"quantity"`
	Unit     string  `json:"unit"`
	Value    float64 `json:"value"`
}

type RecentOrder struct {
	OrderID string    `json:"orderId"`
	Status  string    `json:"status"`
	Total   float64   `json:"total"`
	Date    time.Time `json:"date"`
}

type Alert struct {
	Type     string `json:"type"`
	Severity string `json:"severity"`
	Message  string `json:"message"`
}

type Agg struct {
	Name           string
	MinPrice       float64
	MaxPrice       float64
	AvailableCount int
	Unit           string
	Banner         string
}
