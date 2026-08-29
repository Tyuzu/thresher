package booking

import (
	"context"
	"encoding/json"
	"net/http"
	"slices"
	"time"

	"scav/config/mqevent"
	"scav/infra"
	"scav/infra/mq"
	"scav/utils"
)

const (
	dateFormat = "2006-01-02"

	defaultStartTime = "09:00"
	defaultEndTime   = "17:00"

	defaultTimeout   = 5 * time.Second
	longBatchTimeout = 10 * time.Second
)

// ---------- Utility ----------

func genID() string {
	return utils.GenerateRandomDigitString(22)
}

// ---------- Tier Handlers ----------

func CreateTier(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), defaultTimeout)
		defer cancel()

		var tier Tier
		if err := json.NewDecoder(r.Body).Decode(&tier); err != nil {
			http.Error(w, "invalid JSON", http.StatusBadRequest)
			return
		}

		if tier.ID == "" || tier.EntityType == "" || tier.EntityId == "" || tier.Name == "" {
			http.Error(w, "missing required fields", http.StatusBadRequest)
			return
		}

		tier.CreatedAt = time.Now().Unix()

		if err := InsertTier(ctx, app.DB, tier); err != nil {
			http.Error(w, "db insert failed", http.StatusInternalServerError)
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.TierCreatedEvent, mqevent.TierCreatedPayload{})

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{"tier": tier})
	}
}

func DeleteTier(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tierID := utils.GetParam(r, "id")
		if tierID == "" {
			http.Error(w, "missing id", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), defaultTimeout)
		defer cancel()

		if _, err := DeleteTierByID(ctx, app.DB, tierID); err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

// ---------- Slot Handlers ----------

func CreateSlot(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), defaultTimeout)
		defer cancel()

		var s Slot
		if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}

		if s.EntityType == "" || s.EntityId == "" || s.Date == "" || s.Start == "" || s.Capacity <= 0 {
			http.Error(w, "missing required fields", http.StatusBadRequest)
			return
		}

		if s.TierId != "" {
			var t Tier
			if err := FindTierByID(ctx, app.DB, s.TierId, &t); err == nil {
				s.TierName = t.Name
			}
		}

		s.ID = genID()
		s.CreatedAt = time.Now().Unix()

		if err := InsertSlot(ctx, app.DB, s); err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}

		_ = mq.PublishWithMeta(ctx, app.MQ, mqevent.SlotCreatedEvent, mqevent.SlotCreatedPayload{})

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{"slot": s})
	}
}

func DeleteSlot(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		slotID := utils.GetParam(r, "id")
		if slotID == "" {
			http.Error(w, "missing id", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), defaultTimeout)
		defer cancel()

		if _, err := DeleteSlotByID(ctx, app.DB, slotID); err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		_ = DeleteBookingsBySlot(ctx, app.DB, slotID)

		w.WriteHeader(http.StatusNoContent)
	}
}

// ---------- Slot Generation ----------

type generateSlotsRequest struct {
	StartDate string `json:"startdate"`
	EndDate   string `json:"enddate"`
}

func GenerateSlotsFromTier(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tierID := utils.GetParam(r, "id")
		if tierID == "" {
			http.Error(w, "missing id", http.StatusBadRequest)
			return
		}

		var body generateSlotsRequest
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}

		if body.StartDate == "" || body.EndDate == "" {
			http.Error(w, "missing date range", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), longBatchTimeout)
		defer cancel()

		var tier Tier
		if err := FindTierByID(ctx, app.DB, tierID, &tier); err != nil {
			http.Error(w, "tier not found", http.StatusNotFound)
			return
		}

		startDate, errStart := time.Parse(dateFormat, body.StartDate)
		endDate, errEnd := time.Parse(dateFormat, body.EndDate)
		if errStart != nil || errEnd != nil || startDate.After(endDate) {
			http.Error(w, "invalid date range", http.StatusBadRequest)
			return
		}

		slots := buildSlotsFromTier(tier, startDate, endDate)

		if len(slots) > 0 {
			docs := make([]any, len(slots))
			for i, s := range slots {
				docs[i] = s
			}
			if err := InsertSlotsMany(ctx, app.DB, docs); err != nil {
				http.Error(w, "db error", http.StatusInternalServerError)
				return
			}
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"ok":    true,
			"slots": slots,
		})
	}
}

// ---------- Helper Functions ----------

func buildSlotsFromTier(tier Tier, startDate, endDate time.Time) []Slot {
	var slots []Slot
	now := time.Now().Unix()

	startTime, endTime := defaultStartTime, defaultEndTime
	if len(tier.TimeRange) == 2 {
		startTime, endTime = tier.TimeRange[0], tier.TimeRange[1]
	}

	for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 1) {
		dow := int(d.Weekday())
		if len(tier.DaysOfWeek) > 0 && !slices.Contains(tier.DaysOfWeek, dow) {
			continue
		}

		slots = append(slots, Slot{
			ID:         genID(),
			EntityType: tier.EntityType,
			EntityId:   tier.EntityId,
			Date:       d.Format(dateFormat),
			Start:      startTime,
			End:        endTime,
			Capacity:   tier.Capacity,
			TierId:     tier.ID,
			TierName:   tier.Name,
			CreatedAt:  now,
		})
	}

	return slots
}
