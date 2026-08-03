package vendors

import (
	"encoding/json"
	"net/http"

	"naevis/utils"
)

func writeJSONError(w http.ResponseWriter, status int, code, message string) {
	utils.RespondWithJSON(w, status, map[string]any{
		"success": false,
		"error":   code,
		"message": message,
	})
}

func decodeJSON(r *http.Request, v any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	return decoder.Decode(v)
}
