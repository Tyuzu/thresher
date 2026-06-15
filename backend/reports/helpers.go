package reports

import (
	"encoding/json"
	"net/http"
	"strings"

	"naevis/utils"
)

/* -------------------------
   Helpers
------------------------- */

func stringTrim(s string) string { return strings.TrimSpace(s) }

func getActorID(r *http.Request) string {
	return utils.GetUserIDFromRequest(r)
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if status > 0 {
		w.WriteHeader(status)
	}
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, msg string, status int) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func splitAndTrim(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if t := stringTrim(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}

/* -------------------------
   Payload Types
------------------------- */

type UpdateReportPayload struct {
	Status      string `json:"status"`
	ReviewNotes string `json:"reviewNotes,omitempty"`
}

type CreateAppealPayload struct {
	TargetType string `json:"targetType"`
	TargetID   string `json:"targetId"`
	Reason     string `json:"reason"`
}

type UpdateAppealPayload struct {
	Status      string `json:"status"`
	ReviewNotes string `json:"reviewNotes,omitempty"`
}
