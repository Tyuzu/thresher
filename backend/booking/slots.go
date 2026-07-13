package booking

import (
	"context"
	"encoding/json"
	"naevis/config/mqevent"
	"naevis/infra"
	inmq "naevis/infra/mq"
	"naevis/models"
	"naevis/utils"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
)

// ---------- Utility ----------
func genID() string {
	return utils.GenerateRandomDigitString(22)
}

// ---------- Tier handlers ----------
func CreateTier(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx := r.Context()
		var tier models.Tier
		if err := json.NewDecoder(r.Body).Decode(&tier); err != nil {
			http.Error(w, "invalid JSON", http.StatusBadRequest)
			return
		}

		// basic validation
		if tier.ID == "" || tier.EntityType == "" || tier.EntityId == "" || tier.Name == "" {
			http.Error(w, "missing required fields", http.StatusBadRequest)
			return
		}

		tier.CreatedAt = time.Now().Unix()

		if err := InsertTier(r.Context(), app.DB, tier); err != nil {
			http.Error(w, "db insert failed", http.StatusInternalServerError)
			return
		}

		_ = inmq.PublishWithMeta(ctx, app.MQ, mqevent.TierCreatedEvent, mqevent.TierCreatedPayload{})

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{"tier": tier})
	}
}

func DeleteTier(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		tierId := ps.ByName("id")
		if tierId == "" {
			http.Error(w, "missing id", http.StatusBadRequest)
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if _, err := DeleteTierByID(ctx, app.DB, tierId); err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

// ---------- Slots ----------
func CreateSlot(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		var s models.Slot
		if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
		if s.EntityType == "" || s.EntityId == "" || s.Date == "" || s.Start == "" || s.Capacity <= 0 {
			http.Error(w, "missing required fields", http.StatusBadRequest)
			return
		}

		if s.TierId != "" {
			ctxTmp, cancelTmp := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancelTmp()
			var t models.Tier
			if err := FindTierByID(ctxTmp, app.DB, s.TierId, &t); err == nil {
				s.TierName = t.Name
			}
		}

		s.ID = genID()
		s.CreatedAt = time.Now().Unix()
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := InsertSlot(ctx, app.DB, s); err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}

		_ = inmq.PublishWithMeta(ctx, app.MQ, mqevent.SlotCreatedEvent, mqevent.SlotCreatedPayload{})

		utils.RespondWithJSON(w, http.StatusOK, map[string]interface{}{"slot": s})
	}
}

func DeleteSlot(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		slotId := ps.ByName("id")
		if slotId == "" {
			http.Error(w, "missing id", http.StatusBadRequest)
			return
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if _, err := DeleteSlotByID(ctx, app.DB, slotId); err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		_ = DeleteBookingsBySlot(ctx, app.DB, slotId)

		w.WriteHeader(http.StatusNoContent)
	}
}

// ---------- GenerateSlotsFromTier ----------
func GenerateSlotsFromTier(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		tierId := ps.ByName("id")
		if tierId == "" {
			http.Error(w, "missing id", http.StatusBadRequest)
			return
		}

		var body struct {
			StartDate string `json:"startDate"`
			EndDate   string `json:"endDate"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
		if body.StartDate == "" || body.EndDate == "" {
			http.Error(w, "missing date range", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		var tier models.Tier
		if err := FindTierByID(ctx, app.DB, tierId, &tier); err != nil {
			http.Error(w, "tier not found", http.StatusNotFound)
			return
		}

		startDate, err1 := time.Parse("2006-01-02", body.StartDate)
		endDate, err2 := time.Parse("2006-01-02", body.EndDate)
		if err1 != nil || err2 != nil || startDate.After(endDate) {
			http.Error(w, "invalid date range", http.StatusBadRequest)
			return
		}

		var slots []models.Slot
		for d := startDate; !d.After(endDate); d = d.AddDate(0, 0, 1) {
			dow := int(d.Weekday())
			if len(tier.DaysOfWeek) > 0 {
				allowed := false
				for _, allowedDay := range tier.DaysOfWeek {
					if allowedDay == dow {
						allowed = true
						break
					}
				}
				if !allowed {
					continue
				}
			}

			start, end := "09:00", "17:00"
			if len(tier.TimeRange) == 2 {
				start, end = tier.TimeRange[0], tier.TimeRange[1]
			}

			slots = append(slots, models.Slot{
				ID:         genID(),
				EntityType: tier.EntityType,
				EntityId:   tier.EntityId,
				Date:       d.Format("2006-01-02"),
				Start:      start,
				End:        end,
				Capacity:   tier.Capacity,
				TierId:     tier.ID,
				TierName:   tier.Name,
				CreatedAt:  time.Now().Unix(),
			})
		}

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

		utils.RespondWithJSON(w, http.StatusOK, map[string]interface{}{"ok": true, "slots": slots})
	}
}
