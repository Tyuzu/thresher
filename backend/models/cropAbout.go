package models

type CropAbout struct {
	ID                 string             `bson:"id" json:"id"`
	CommonName         string             `bson:"commonName" json:"commonName"`
	ScientificName     string             `bson:"scientificName" json:"scientificName"`
	Image              string             `bson:"image" json:"image"`
	ImageAlt           string             `bson:"imageAlt" json:"imageAlt"`
	Description        string             `bson:"description" json:"description"`
	NutritionalValues  []NutritionalValue `bson:"nutritionalValues" json:"nutritionalValues"`
	GrowingConditions  GrowingConditions  `bson:"growingConditions" json:"growingConditions"`
	PlantingHarvesting string             `bson:"plantingHarvesting" json:"plantingHarvesting"`
	CareTips           []string           `bson:"careTips" json:"careTips"`
	Varieties          []string           `bson:"varieties" json:"varieties"`
	Usage              string             `bson:"usage" json:"usage"`
	FunFacts           []string           `bson:"funFacts" json:"funFacts"`
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
