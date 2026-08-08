package deliveries

import "errors"

// State definitions
const (
	StatusCreated   = "CREATED"
	StatusAssigned  = "ASSIGNED"
	StatusAccepted  = "ACCEPTED"
	StatusPickedUp  = "PICKED_UP"
	StatusInTransit = "IN_TRANSIT"
	StatusDelivered = "DELIVERED"
	StatusCancelled = "CANCELLED"
)

var AllowedTransitions = map[string][]string{
	StatusCreated:   {StatusAssigned, StatusAccepted, StatusCancelled},
	StatusAssigned:  {StatusAccepted, StatusCancelled},
	StatusAccepted:  {StatusPickedUp, StatusCancelled},
	StatusPickedUp:  {StatusInTransit, StatusCancelled},
	StatusInTransit: {StatusDelivered, StatusCancelled},
	StatusDelivered: {},
	StatusCancelled: {},
}

func ValidateTransition(currentStatus, newStatus string) error {
	allowed, ok := AllowedTransitions[currentStatus]
	if !ok {
		return errors.New("invalid initial status state")
	}

	for _, status := range allowed {
		if status == newStatus {
			return nil
		}
	}
	return errors.New("illegal delivery status transition from " + currentStatus + " to " + newStatus)
}
