package baito

type BaitoRequest struct {
	Title           string   `json:"title" bson:"title"`
	Description     string   `json:"description" bson:"description"`
	Category        string   `json:"category" bson:"category"`
	SubCategory     string   `json:"sub_category" bson:"sub_category"`
	Location        string   `json:"location" bson:"location"`
	Wage            string   `json:"wage" bson:"wage"`
	Phone           string   `json:"phone" bson:"phone"`
	Requirements    string   `json:"requirements" bson:"requirements"`
	WorkHours       string   `json:"work_hours" bson:"work_hours"`
	Benefits        string   `json:"benefits" bson:"benefits"`
	Email           string   `json:"email" bson:"email"`
	Tags            []string `json:"tags" bson:"tags"`
	Duration        string   `json:"duration" bson:"duration"`
	LastDateToApply string   `json:"last_date_to_apply" bson:"last_date_to_apply"`
}

type UpdateBaitoResponse struct {
	Message string `json:"message"`
	BaitoID string `json:"baitoid"`
}
