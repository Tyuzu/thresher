package deliveries

import "time"

type Location struct {
	Address     string    `json:"address" bson:"address"`
	Lat         float64   `json:"lat" bson:"lat"`
	Lng         float64   `json:"lng" bson:"lng"`
	Type        string    `json:"type,omitempty" bson:"type,omitempty"`               // e.g., "Point"
	Coordinates []float64 `json:"coordinates,omitempty" bson:"coordinates,omitempty"` // [lng, lat]
}

type StatusHistoryItem struct {
	Status    string    `json:"status" bson:"status"`
	Timestamp time.Time `json:"timestamp" bson:"timestamp"`
	UpdatedBy string    `json:"updated_by" bson:"updated_by"`
}

type Proof struct {
	ProofID   string    `json:"proof_id" bson:"_id"`
	Type      string    `json:"type" bson:"type"` // e.g. "PHOTO", "SIGNATURE"
	URL       string    `json:"url" bson:"url"`
	CreatedAt time.Time `json:"created_at" bson:"created_at"`
}

type Delivery struct {
	DeliveryID          string              `json:"delivery_id" bson:"_id"`
	TenantID            string              `json:"tenant_id" bson:"tenant_id"`
	UserID              string              `json:"user_id" bson:"user_id"`
	DriverID            *string             `json:"driver_id" bson:"driver_id"`
	Status              string              `json:"status" bson:"status"`
	StatusHistory       []StatusHistoryItem `json:"status_history,omitempty" bson:"status_history,omitempty"`
	PickupLoc           Location            `json:"pickup_loc" bson:"pickup_loc"`
	DropoffLoc          Location            `json:"dropoff_loc" bson:"dropoff_loc"`
	CurrentLocation     *Location           `json:"current_location,omitempty" bson:"current_location,omitempty"`
	Proofs              []Proof             `json:"proofs,omitempty" bson:"proofs,omitempty"`
	PublicTrackingToken string              `json:"public_tracking_token,omitempty" bson:"public_tracking_token"`
	EstimatedArrival    *time.Time          `json:"estimated_arrival,omitempty" bson:"estimated_arrival,omitempty"`
	CreatedAt           time.Time           `json:"created_at" bson:"created_at"`
	UpdatedAt           time.Time           `json:"updated_at" bson:"updated_at"`
}

type GPSData struct {
	Lat       float64   `json:"lat" bson:"lat"`
	Lng       float64   `json:"lng" bson:"lng"`
	Timestamp time.Time `json:"timestamp" bson:"timestamp"`
}

type Driver struct {
	DriverID     string    `json:"driver_id" bson:"_id"`
	TenantID     string    `json:"tenant_id" bson:"tenant_id"`
	Name         string    `json:"name" bson:"name"`
	IsOnline     bool      `json:"is_online" bson:"is_online"`
	CurrentState string    `json:"current_state" bson:"current_state"`
	UpdatedAt    time.Time `json:"updated_at" bson:"updated_at"`
}

type Webhook struct {
	WebhookID string    `json:"webhook_id" bson:"_id"`
	TenantID  string    `json:"tenant_id" bson:"tenant_id"`
	URL       string    `json:"url" bson:"url"`
	Events    []string  `json:"events" bson:"events"`
	Secret    string    `json:"secret" bson:"secret"`
	CreatedAt time.Time `json:"created_at" bson:"created_at"`
}
