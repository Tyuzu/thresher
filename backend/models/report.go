package models

import (
	"time"
)

type Report struct {
	ReportID    string    `bson:"reportid,omitempty" json:"id"`
	ReportedBy  string    `json:"reportedby"  bson:"reportedby"`
	TargetID    string    `json:"targetid"    bson:"targetid"`
	TargetType  string    `json:"targettype"  bson:"targettype"`
	Reason      string    `json:"reason"      bson:"reason"`
	Notes       string    `json:"notes,omitempty"      bson:"notes,omitempty"`
	Status      string    `json:"status"      bson:"status"`
	ReviewedBy  string    `json:"reviewedby,omitempty"  bson:"reviewedBby,omitempty"`
	ReviewNotes string    `json:"reviewnotes,omitempty" bson:"reviewnotes,omitempty"`
	CreatedAt   time.Time `json:"createdat"   bson:"createdat"`
	UpdatedAt   time.Time `json:"updatedat"   bson:"updatedat"`

	// New fields for parent reference
	ParentType string `json:"parenttype,omitempty" bson:"parenttype,omitempty"`
	ParentID   string `json:"parentid,omitempty"   bson:"parentid,omitempty"`

	// New field to indicate whether the reporter has been notified
	Notified bool `json:"notified" bson:"notified"`
}
