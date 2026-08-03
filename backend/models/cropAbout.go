package models

type CropAbout struct {
	ID                 string             `bson:"id" json:"id"`
	CommonName         string             `bson:"commonname" json:"commonname"`
	ScientificName     string             `bson:"scientificname" json:"scientificname"`
	Image              string             `bson:"image" json:"image"`
	ImageAlt           string             `bson:"imagealt" json:"imagealt"`
	Description        string             `bson:"description" json:"description"`
	NutritionalValues  []NutritionalValue `bson:"nutritionalvalues" json:"nutritionalvalues"`
	GrowingConditions  GrowingConditions  `bson:"growingconditions" json:"growingconditions"`
	PlantingHarvesting string             `bson:"plantingharvesting" json:"plantingHarvesting"`
	CareTips           []string           `bson:"caretips" json:"caretips"`
	Varieties          []string           `bson:"varieties" json:"varieties"`
	Usage              string             `bson:"usage" json:"usage"`
	FunFacts           []string           `bson:"funfacts" json:"funfacts"`
}

type NutritionalValue struct {
	Label string `bson:"label" json:"label"`
	Value string `bson:"value" json:"value"`
}

type GrowingConditions struct {
	Soil        string `bson:"soil" json:"soil"`
	Sunlight    string `bson:"sunlight" json:"sunlight"`
	Water       string `bson:"water" json:"water"`
	Temperature string `bson:"temperature" json:"temperature"`
}
