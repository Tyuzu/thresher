package farms

import "time"

/* ---------------------------------------------------- */
/* DTOs                                                 */
/* ---------------------------------------------------- */

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
