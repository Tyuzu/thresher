package vendors

import (
	"errors"

	"naevis/config"
)

var (
	vendorCollection = config.Collections.VendorCollection
	hiringCollection = config.Collections.HiringCollection

	ErrVendorNotFound      = errors.New("vendor not found")
	ErrVendorAlreadyExists = errors.New("vendor profile already exists")
	ErrVendorAlreadyHired  = errors.New("vendor already hired for this event")
	ErrVendorNotInEvent    = errors.New("vendor not found for this event")
	ErrUnauthorizedVendor  = errors.New("unauthorized vendor action")
)
