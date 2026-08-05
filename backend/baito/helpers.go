package baito

import (
	"errors"
	"net/http"
)

const maxBaitoMultipartMemory = 10 << 20

func ParseMultipartFormWithLimit(r *http.Request) error {
	if r == nil {
		return errors.New("request is nil")
	}
	if r.ContentLength > maxBaitoMultipartMemory {
		return http.ErrMissingFile
	}
	r.Body = http.MaxBytesReader(nil, r.Body, maxBaitoMultipartMemory)
	if err := r.ParseMultipartForm(maxBaitoMultipartMemory); err != nil { // #nosec G120 - form size bounded by MaxBytesReader
		return err
	}
	if r.MultipartForm != nil {
		_ = r.MultipartForm.RemoveAll()
	}
	return nil
}
