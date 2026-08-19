package likes

import "errors"

var (
	ErrNotLiked     = errors.New("like does not exist")
	ErrAlreadyLiked = errors.New("err already liked")
)
