package models

import "time"

type DashboardResponse struct {
	Stats           DashboardStats    `json:"stats"`
	Inventory       InventoryMetrics  `json:"inventory"`
	Orders          OrderMetrics      `json:"orders"`
	Revenue         RevenueMetrics    `json:"revenue"`
	Harvests        HarvestMetrics    `json:"harvests"`
	Customers       CustomerMetrics   `json:"customers"`
	Alerts          []Alert           `json:"alerts"`
	Recommendations []string          `json:"recommendations"`
	TopCrops        []CropPerformance `json:"topcrops"`
	ActivityFeed    []ActivityItem    `json:"activityfeed"`
}

type DashboardStats struct {
	HealthScore int `json:"healthscore"`
}

type InventoryMetrics struct {
	TotalCrops      int     `json:"totalcrops"`
	TotalQuantity   int64   `json:"totalquantity"`
	InventoryValue  float64 `json:"inventoryvalue"`
	FeaturedCrops   int     `json:"featuredcrops"`
	LowStockCount   int     `json:"lowstockcount"`
	OutOfStockCount int     `json:"outofstockcount"`
}

type OrderMetrics struct {
	PendingOrders   int `json:"pendingorders"`
	CompletedOrders int `json:"completedorders"`
	CancelledOrders int `json:"cancelledorders"`
	TodayDeliveries int `json:"todaydeliveries"`
}

type RevenueMetrics struct {
	TodayRevenue    float64 `json:"todayrevenue"`
	WeeklyRevenue   float64 `json:"weeklyrevenue"`
	MonthlyRevenue  float64 `json:"monthlyrevenue"`
	LifetimeRevenue float64 `json:"lifetimerevenue"`
}

type HarvestMetrics struct {
	ReadyNow        int `json:"readynow"`
	Next7Days       int `json:"next7days"`
	DelayedHarvests int `json:"delayedharvests"`
}

type CustomerMetrics struct {
	UniqueCustomers int `json:"uniquecustomers"`
	RepeatCustomers int `json:"repeatcustomers"`
}

type Alert struct {
	Type     string `json:"type"`
	Severity string `json:"severity"`
	Message  string `json:"message"`
}

type CropPerformance struct {
	Name     string  `json:"name"`
	Quantity int64   `json:"quantity"`
	Value    float64 `json:"value"`
	Revenue  float64 `json:"revenue"`
}

type ActivityItem struct {
	Type      string    `json:"type"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"createdat"`
}
