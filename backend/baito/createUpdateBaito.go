package baito

import (
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"naevis/config/mqevent"
	"naevis/infra"
	inmq "naevis/infra/mq"
	"naevis/models"
	"naevis/utils"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type BaitoRequest struct {
	Title           string
	Description     string
	Category        string
	SubCategory     string
	Location        string
	Wage            string
	Phone           string
	Requirements    string
	WorkHours       string
	Benefits        string
	Email           string
	Tags            []string
	Duration        string
	LastDateToApply string
}

func parseTags(raw string) []string {
	var tags []string

	for _, t := range strings.Split(raw, ",") {
		if tag := strings.TrimSpace(t); tag != "" {
			tags = append(tags, tag)
		}
	}

	return tags
}

const maxBaitoMultipartMemory = 10 << 20

func parseMultipartFormWithLimit(r *http.Request) error {
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

func ParseBaitoRequest(r *http.Request) (BaitoRequest, error) {
	if err := parseMultipartFormWithLimit(r); err != nil {
		return BaitoRequest{}, err
	}

	if r.MultipartForm != nil {
		defer r.MultipartForm.RemoveAll()
	}

	return BaitoRequest{
		Title:           strings.TrimSpace(r.FormValue("title")),
		Description:     strings.TrimSpace(r.FormValue("description")),
		Category:        strings.TrimSpace(r.FormValue("category")),
		SubCategory:     strings.TrimSpace(r.FormValue("subcategory")),
		Location:        strings.TrimSpace(r.FormValue("location")),
		Wage:            strings.TrimSpace(r.FormValue("wage")),
		Phone:           strings.TrimSpace(r.FormValue("phone")),
		Requirements:    strings.TrimSpace(r.FormValue("requirements")),
		WorkHours:       strings.TrimSpace(r.FormValue("workHours")),
		Benefits:        strings.TrimSpace(r.FormValue("benefits")),
		Email:           strings.TrimSpace(r.FormValue("email")),
		Tags:            parseTags(r.FormValue("tags")),
		Duration:        strings.TrimSpace(r.FormValue("duration")),
		LastDateToApply: strings.TrimSpace(r.FormValue("lastDateToApply")),
	}, nil
}

func parseOptionalDate(value string) (time.Time, bool) {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}, false
	}

	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return time.Time{}, false
	}

	return parsed.UTC(), true
}

func (r BaitoRequest) Validate() error {
	switch {
	case r.Title == "":
		return errors.New("title is required")
	case r.Description == "":
		return errors.New("description is required")
	case r.Category == "":
		return errors.New("category is required")
	case r.SubCategory == "":
		return errors.New("subcategory is required")
	case r.Location == "":
		return errors.New("location is required")
	case r.Wage == "":
		return errors.New("wage is required")
	case r.Phone == "":
		return errors.New("phone is required")
	case r.Requirements == "":
		return errors.New("requirements are required")
	case r.WorkHours == "":
		return errors.New("work hours are required")
	case r.Duration == "" && r.LastDateToApply == "":
		return errors.New("please provide either a job duration or an application deadline")
	case r.LastDateToApply != "":
		if _, ok := parseOptionalDate(r.LastDateToApply); !ok {
			return errors.New("application deadline must be a valid YYYY-MM-DD date")
		}
	}

	return nil
}

func (r BaitoRequest) ToModel(userID string) models.Baito {
	now := time.Now()
	var deadline *time.Time
	if parsed, ok := parseOptionalDate(r.LastDateToApply); ok {
		deadline = &parsed
	}

	return models.Baito{
		BaitoId:         utils.GenerateRandomString(15),
		Title:           r.Title,
		Description:     r.Description,
		Category:        r.Category,
		SubCategory:     r.SubCategory,
		Location:        r.Location,
		Wage:            r.Wage,
		Phone:           r.Phone,
		Requirements:    r.Requirements,
		WorkHours:       r.WorkHours,
		Benefits:        r.Benefits,
		Email:           r.Email,
		Tags:            r.Tags,
		Duration:        r.Duration,
		LastDateToApply: deadline,
		OwnerID:         userID,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
}

func (r BaitoRequest) BuildUpdate() bson.M {
	set := bson.M{}

	if r.Title != "" {
		set["title"] = r.Title
	}

	if r.Description != "" {
		set["description"] = r.Description
	}

	if r.Category != "" {
		set["category"] = r.Category
	}

	if r.SubCategory != "" {
		set["subcategory"] = r.SubCategory
	}

	if r.Location != "" {
		set["location"] = r.Location
	}

	if r.Wage != "" {
		set["wage"] = r.Wage
	}

	if r.Phone != "" {
		set["phone"] = r.Phone
	}

	if r.Requirements != "" {
		set["requirements"] = r.Requirements
	}

	if r.WorkHours != "" {
		set["workHours"] = r.WorkHours
	}

	if r.Benefits != "" {
		set["benefits"] = r.Benefits
	}

	if r.Email != "" {
		set["email"] = r.Email
	}

	if r.Duration != "" {
		set["duration"] = r.Duration
	}

	if deadline, ok := parseOptionalDate(r.LastDateToApply); ok {
		set["lastdate"] = deadline
	}

	if len(r.Tags) > 0 {
		set["tags"] = r.Tags
	}

	set["updatedAt"] = time.Now()

	return bson.M{
		"$set": set,
	}
}

func CreateBaito(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		ctx := r.Context()

		req, err := ParseBaitoRequest(r)
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "invalid form data")
			return
		}

		if err := req.Validate(); err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, err.Error())
			return
		}

		baito := req.ToModel(
			utils.GetUserIDFromRequest(r),
		)

		if err := app.DB.Insert(ctx, BaitoCollection, baito); err != nil {
			log.Printf("Insert error: %v", err)

			utils.RespondWithError(
				w,
				http.StatusInternalServerError,
				"failed to save baito",
			)
			return
		}

		_ = inmq.PublishWithMeta(ctx, app.MQ, mqevent.BaitoCreatedEvent, mqevent.BaitoCreatedPayload{})

		utils.RespondWithJSON(w, http.StatusOK, struct {
			BaitoID string `json:"baitoid"`
		}{
			BaitoID: baito.BaitoId,
		})
	}
}

func UpdateBaito(app *infra.Deps) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()

		req, err := ParseBaitoRequest(r)
		if err != nil {
			utils.RespondWithError(w, http.StatusBadRequest, "invalid form data")
			return
		}

		update := req.BuildUpdate()

		filter := bson.M{
			"baitoid": ps.ByName("baitoid"),
			"ownerid": utils.GetUserIDFromRequest(r),
		}

		err = app.DB.UpdateOne(
			ctx,
			BaitoCollection,
			filter,
			update,
		)

		if err != nil {
			if err == mongo.ErrNoDocuments {
				utils.RespondWithError(
					w,
					http.StatusNotFound,
					"baito not found or unauthorized",
				)
				return
			}

			log.Printf("Update error: %v", err)

			utils.RespondWithError(
				w,
				http.StatusInternalServerError,
				"failed to update baito",
			)
			return
		}

		_ = inmq.PublishWithMeta(ctx, app.MQ, mqevent.BaitoUpdatedEvent, mqevent.BaitoUpdatedPayload{})

		utils.RespondWithJSON(w, http.StatusOK, struct {
			Message string `json:"message"`
			BaitoID string `json:"baitoid"`
		}{
			Message: "Baito updated",
			BaitoID: ps.ByName("baitoid"),
		})
	}
}
