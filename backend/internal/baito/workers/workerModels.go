package workers

type BaitoWorker struct {
	UserID        string   `json:"userid" bson:"userid"`
	BaitoWorkerId string   `json:"baitoWorkerId" bson:"baitoWorkerId"`
	Name          string   `json:"name" bson:"name"`
	Age           int      `json:"age" bson:"age"`
	Phone         string   `json:"phone" bson:"phone"`
	Location      string   `json:"location" bson:"location"`
	Preferred     []string `json:"preferredRoles" bson:"preferredRoles"`
	Bio           string   `json:"bio" bson:"bio"`
	Avatar        string   `json:"avatar" bson:"avatar"`
	Email         string   `json:"email,omitempty" bson:"email,omitempty"`
	Experience    string   `json:"experience,omitempty" bson:"experience,omitempty"`
	Skills        string   `json:"skills,omitempty" bson:"skills,omitempty"`
	Availability  string   `json:"availability,omitempty" bson:"availability,omitempty"`
	ExpectedWage  string   `json:"expectedWage,omitempty" bson:"expectedWage,omitempty"`
	Languages     string   `json:"languages,omitempty" bson:"languages,omitempty"`
	Documents     []string `json:"documents,omitempty" bson:"documents,omitempty"`
	CreatedAt     int64    `json:"createdAt" bson:"createdAt"`
	UpdatedAt     int64    `json:"updatedAt,omitempty" bson:"updatedAt,omitempty"`
}
type BaitoWorkersResponse struct {
	UserID        string   `json:"userid" bson:"userid"`
	BaitoWorkerId string   `json:"baitoWorkerId" bson:"baitoWorkerId"`
	Name          string   `json:"name" bson:"name"`
	Age           int      `json:"age" bson:"age"`
	Phone         string   `json:"phone" bson:"phone"`
	Location      string   `json:"location" bson:"location"`
	Preferred     []string `json:"preferredRoles" bson:"preferredRoles"`
	Bio           string   `json:"bio" bson:"bio"`
	ProfilePic    string   `json:"profilePic" bson:"profilePic"`
	CreatedAt     int64    `json:"createdAt" bson:"createdAt"`
}
