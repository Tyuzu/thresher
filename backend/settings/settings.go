package settings

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"naevis/config"
	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/utils"

	"go.mongodb.org/mongo-driver/bson"
)

/* -------------------------
   Models
------------------------- */

type UserSettings struct {
	UserID string `json:"-" bson:"userid"`

	Theme string `json:"theme" bson:"theme"`

	Notifications      bool `json:"notifications" bson:"notifications"`
	EmailNotifications bool `json:"emailnotifications" bson:"emailnotifications"`
	PushNotifications  bool `json:"pushnotifications" bson:"pushnotifications"`

	PrivacyMode       bool   `json:"privacymode" bson:"privacymode"`
	ProfileVisibility string `json:"profilevisibility" bson:"profilevisibility"`

	AutoLogout     bool `json:"autologout" bson:"autologout"`
	SessionTimeout int  `json:"sessiontimeout" bson:"sessiontimeout"`

	Language string `json:"language" bson:"language"`
	TimeZone string `json:"timezone" bson:"timezone"`
	Currency string `json:"currency" bson:"currency"`

	DailyReminder string `json:"dailyreminder" bson:"dailyreminder"`
}

type SettingSchema struct {
	Type        string   `json:"type"`
	Label       string   `json:"label"`
	Description string   `json:"description"`
	Control     string   `json:"control"`
	Category    string   `json:"category"`
	Options     []string `json:"options,omitempty"`
}

/* -------------------------
   Defaults
------------------------- */

func DefaultSettings(userID string) UserSettings {
	return UserSettings{
		UserID: userID,

		Theme: "light",

		Notifications:      true,
		EmailNotifications: true,
		PushNotifications:  true,

		PrivacyMode:       false,
		ProfileVisibility: "public",

		AutoLogout:     false,
		SessionTimeout: 30,

		Language: "english",
		TimeZone: "UTC",
		Currency: "INR",

		DailyReminder: "09:00",
	}
}

var settingsSchema = []SettingSchema{
	{
		Type:        "theme",
		Label:       "Theme",
		Description: "Choose application theme",
		Control:     "select",
		Category:    "Appearance",
		Options:     []string{"light", "dark", "system"},
	},
	{
		Type:        "notifications",
		Label:       "Notifications",
		Description: "Enable notifications",
		Control:     "toggle",
		Category:    "Notifications",
	},
	{
		Type:        "emailnotifications",
		Label:       "Email Notifications",
		Description: "Receive email notifications",
		Control:     "toggle",
		Category:    "Notifications",
	},
	{
		Type:        "pushnotifications",
		Label:       "Push Notifications",
		Description: "Receive push notifications",
		Control:     "toggle",
		Category:    "Notifications",
	},
	{
		Type:        "privacymode",
		Label:       "Privacy Mode",
		Description: "Hide sensitive information",
		Control:     "toggle",
		Category:    "Privacy",
	},
	{
		Type:        "profilevisibility",
		Label:       "Profile Visibility",
		Description: "Who can see your profile",
		Control:     "select",
		Category:    "Privacy",
		Options:     []string{"public", "friends", "private"},
	},
	{
		Type:        "autologout",
		Label:       "Auto Logout",
		Description: "Automatically log out after inactivity",
		Control:     "toggle",
		Category:    "Security",
	},
	{
		Type:        "sessiontimeout",
		Label:       "Session Timeout",
		Description: "Minutes before session expires",
		Control:     "number",
		Category:    "Security",
	},
	{
		Type:        "language",
		Label:       "Language",
		Description: "Select language",
		Control:     "select",
		Category:    "Localization",
		Options:     []string{"english", "spanish", "french"},
	},
	{
		Type:        "timezone",
		Label:       "Time Zone",
		Description: "Select time zone",
		Control:     "select",
		Category:    "Localization",
		Options:     []string{"UTC", "PST", "EST", "IST"},
	},
	{
		Type:        "currency",
		Label:       "Currency",
		Description: "Preferred currency",
		Control:     "select",
		Category:    "Localization",
		Options:     []string{"INR", "USD", "EUR"},
	},
	{
		Type:        "dailyreminder",
		Label:       "Daily Reminder",
		Description: "Set daily reminder time",
		Control:     "time",
		Category:    "Productivity",
	},
}

/* -------------------------
   Helpers
------------------------- */

func getUserID(r *http.Request) (string, bool) {
	v := r.Context().Value(config.UserIDKey)
	userID, ok := v.(string)
	if !ok || strings.TrimSpace(userID) == "" {
		return "", false
	}
	return userID, true
}

func boolFromAny(v any) (bool, bool) {
	b, ok := v.(bool)
	return b, ok
}

func stringFromAny(v any) (string, bool) {
	s, ok := v.(string)
	return s, ok
}

func intFromAny(v any) (int, bool) {
	switch n := v.(type) {
	case float64:
		return int(n), true
	case float32:
		return int(n), true
	case int:
		return n, true
	case int32:
		return int(n), true
	case int64:
		return int(n), true
	default:
		return 0, false
	}
}

func validateSetting(key string, value any) error {
	switch key {
	case "theme":
		s, ok := stringFromAny(value)
		if !ok {
			return errors.New("theme must be a string")
		}
		switch s {
		case "light", "dark", "system":
			return nil
		default:
			return errors.New("invalid theme")
		}

	case "notifications", "emailnotifications", "pushnotifications", "privacymode", "autologout":
		if _, ok := boolFromAny(value); !ok {
			return errors.New(key + " must be a boolean")
		}
		return nil

	case "profilevisibility":
		s, ok := stringFromAny(value)
		if !ok {
			return errors.New("profilevisibility must be a string")
		}
		switch s {
		case "public", "friends", "private":
			return nil
		default:
			return errors.New("invalid profilevisibility")
		}

	case "sessiontimeout":
		n, ok := intFromAny(value)
		if !ok {
			return errors.New("sessiontimeout must be a number")
		}
		if n < 1 || n > 1440 {
			return errors.New("sessiontimeout must be between 1 and 1440")
		}
		return nil

	case "language":
		s, ok := stringFromAny(value)
		if !ok {
			return errors.New("language must be a string")
		}
		switch s {
		case "english", "spanish", "french":
			return nil
		default:
			return errors.New("invalid language")
		}

	case "timezone":
		s, ok := stringFromAny(value)
		if !ok {
			return errors.New("timezone must be a string")
		}
		switch s {
		case "UTC", "PST", "EST", "IST":
			return nil
		default:
			return errors.New("invalid timezone")
		}

	case "currency":
		s, ok := stringFromAny(value)
		if !ok {
			return errors.New("currency must be a string")
		}
		switch s {
		case "INR", "USD", "EUR":
			return nil
		default:
			return errors.New("invalid currency")
		}

	case "dailyreminder":
		s, ok := stringFromAny(value)
		if !ok {
			return errors.New("dailyreminder must be a string")
		}
		if len(s) != 5 || s[2] != ':' {
			return errors.New("dailyreminder must be in HH:MM format")
		}
		return nil
	}

	return errors.New("invalid setting type")
}

func settingsToMap(s UserSettings) bson.M {
	return bson.M{
		"userid":             s.UserID,
		"theme":              s.Theme,
		"notifications":      s.Notifications,
		"emailnotifications": s.EmailNotifications,
		"pushnotifications":  s.PushNotifications,
		"privacymode":        s.PrivacyMode,
		"profilevisibility":  s.ProfileVisibility,
		"autologout":         s.AutoLogout,
		"sessiontimeout":     s.SessionTimeout,
		"language":           s.Language,
		"timezone":           s.TimeZone,
		"currency":           s.Currency,
		"dailyreminder":      s.DailyReminder,
	}
}

func applyPatch(target *UserSettings, key string, value any) {
	switch key {
	case "theme":
		target.Theme, _ = value.(string)
	case "notifications":
		target.Notifications, _ = value.(bool)
	case "emailnotifications":
		target.EmailNotifications, _ = value.(bool)
	case "pushnotifications":
		target.PushNotifications, _ = value.(bool)
	case "privacymode":
		target.PrivacyMode, _ = value.(bool)
	case "profilevisibility":
		target.ProfileVisibility, _ = value.(string)
	case "autologout":
		target.AutoLogout, _ = value.(bool)
	case "sessiontimeout":
		if n, ok := intFromAny(value); ok {
			target.SessionTimeout = n
		}
	case "language":
		target.Language, _ = value.(string)
	case "timezone":
		target.TimeZone, _ = value.(string)
	case "currency":
		target.Currency, _ = value.(string)
	case "dailyreminder":
		target.DailyReminder, _ = value.(string)
	}
}

/* -------------------------
   Handlers
------------------------- */

func GetSettings(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		userID, ok := getUserID(r)
		if !ok {
			utils.RespondWithJSON(w, http.StatusUnauthorized, map[string]string{
				"error": "unauthorized",
			})
			return
		}

		var settings UserSettings
		err := app.DB.FindOne(
			ctx,
			settingsCollection,
			bson.M{"userID": userID},
			&settings,
		)

		if err != nil {
			settings = DefaultSettings(userID)
			_ = app.DB.Insert(ctx, settingsCollection, settings)
		}

		utils.RespondWithJSON(w, http.StatusOK, settings)
	}
}

func GetSettingsSchema(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		utils.RespondWithJSON(w, http.StatusOK, settingsSchema)
	}
}

func UpdateSettings(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		userID, ok := getUserID(r)
		if !ok {
			utils.RespondWithJSON(w, http.StatusUnauthorized, map[string]string{
				"error": "unauthorized",
			})
			return
		}

		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			utils.RespondWithJSON(w, http.StatusBadRequest, map[string]string{
				"error": "invalid payload",
			})
			return
		}

		allowed := map[string]bool{
			"theme":              true,
			"notifications":      true,
			"emailnotifications": true,
			"pushnotifications":  true,
			"privacymode":        true,
			"profilevisibility":  true,
			"autologout":         true,
			"sessiontimeout":     true,
			"language":           true,
			"timezone":           true,
			"currency":           true,
			"dailyreminder":      true,
		}

		filter := bson.M{"userID": userID}
		updateFields := bson.M{}

		for key, value := range payload {
			if !allowed[key] {
				utils.RespondWithJSON(w, http.StatusBadRequest, map[string]string{
					"error": "invalid setting type: " + key,
				})
				return
			}

			if err := validateSetting(key, value); err != nil {
				utils.RespondWithJSON(w, http.StatusBadRequest, map[string]string{
					"error": err.Error(),
				})
				return
			}

			updateFields[key] = value
		}

		if len(updateFields) == 0 {
			utils.RespondWithJSON(w, http.StatusBadRequest, map[string]string{
				"error": "empty update payload",
			})
			return
		}

		if err := app.DB.Update(ctx, settingsCollection, filter, updateFields); err != nil {
			settings := DefaultSettings(userID)
			doc := settingsToMap(settings)

			for k, v := range updateFields {
				doc[k] = v
				applyPatch(&settings, k, v)
			}

			_ = app.DB.Insert(ctx, settingsCollection, doc)
		}

		mqpayload, _ := json.Marshal(mqevent.UserSettingsUpdatedPayload{})
		app.MQ.Publish(ctx, mqevent.UserSettingsUpdatedEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"status":  "success",
			"message": "settings updated",
			"data":    updateFields,
		})
	}
}

func ResetSettings(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		userID, ok := getUserID(r)
		if !ok {
			utils.RespondWithJSON(w, http.StatusUnauthorized, map[string]string{
				"error": "unauthorized",
			})
			return
		}

		defaults := DefaultSettings(userID)
		filter := bson.M{"userID": userID}
		update := settingsToMap(defaults)

		if err := app.DB.Update(ctx, settingsCollection, filter, update); err != nil {
			_ = app.DB.Insert(ctx, settingsCollection, update)
		}

		mqpayload, _ := json.Marshal(mqevent.UserSettingsResetPayload{})
		app.MQ.Publish(ctx, mqevent.UserSettingsResetEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{
			"status":  "success",
			"message": "settings reset to defaults",
		})
	}
}

func InitUserSettings(app *infra.Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		userID, ok := getUserID(r)
		if !ok {
			utils.RespondWithJSON(w, http.StatusUnauthorized, map[string]string{
				"error": "unauthorized",
			})
			return
		}

		var existing UserSettings
		err := app.DB.FindOne(
			ctx,
			settingsCollection,
			bson.M{"userID": userID},
			&existing,
		)

		if err == nil {
			utils.RespondWithJSON(w, http.StatusOK, false)
			return
		}

		defaults := DefaultSettings(userID)
		if err := app.DB.Insert(ctx, settingsCollection, defaults); err != nil {
			utils.RespondWithJSON(w, http.StatusInternalServerError, map[string]string{
				"error": "failed to initialize settings",
			})
			return
		}

		mqpayload, _ := json.Marshal(mqevent.UserSettingsInitiatedPayload{})
		app.MQ.Publish(ctx, mqevent.UserSettingsInitiatedEvent, mqpayload)

		utils.RespondWithJSON(w, http.StatusOK, true)
	}
}
