package artists

import "errors"

var (
	ErrInvalidPayload     = errors.New("invalid request payload")
	ErrDatabase           = errors.New("database error")
	ErrFailedToAddEvent   = errors.New("failed to add event details")
	ErrEventNotFound      = errors.New("event not found")
	ErrArtistAlreadyAdded = errors.New("artist already added to this event")
	ErrUpdateFailed       = errors.New("artist event not found or update failed")
)
