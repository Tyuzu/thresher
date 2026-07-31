package maps

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"

	"naevis/utils"

	"github.com/julienschmidt/httprouter"
)

// --- Domain Structs ---

type MapDimensions struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}

type MapAsset struct {
	Image         string        `json:"image"`
	FallbackImage string        `json:"fallbackImage"`
	Dimensions    MapDimensions `json:"dimensions"`
}

type LocationDetails struct {
	Address   string `json:"address,omitempty"`
	Price     int    `json:"price,omitempty"`
	IntelData string `json:"intelData,omitempty"`
}

type LocationMarker struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	Category    string          `json:"category"`
	X           float64         `json:"x"`
	Y           float64         `json:"y"`
	Icon        string          `json:"icon,omitempty"`
	IconURL     string          `json:"iconUrl,omitempty"`
	Description string          `json:"description"`
	MembersOnly bool            `json:"membersOnly"`
	Details     LocationDetails `json:"details,omitempty"`
}

type LockedArea struct {
	ID        string  `json:"id"`
	Label     string  `json:"label"`
	X         float64 `json:"x"`
	Y         float64 `json:"y"`
	Width     float64 `json:"width"`
	Height    float64 `json:"height"`
	Condition string  `json:"condition"`
	DependsOn string  `json:"dependsOn"`
}

type MapConfig struct {
	Entity      string       `json:"entity"`
	Title       string       `json:"title"`
	Map         MapAsset     `json:"map"`
	LockedAreas []LockedArea `json:"lockedAreas"`
}

type MapResponseData struct {
	Entity         string           `json:"entity"`
	Title          string           `json:"title"`
	Map            MapAsset         `json:"map"`
	Locations      []LocationMarker `json:"locations"`
	LockedAreas    []LockedArea     `json:"lockedAreas,omitempty"`
	PlayerProgress map[string]int   `json:"playerProgress"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// --- Thread-Safe Store ---

type MapStore struct {
	mu                      sync.RWMutex
	playerMissionsCompleted map[string]int
	configs                 map[string]MapConfig
	markers                 map[string][]LocationMarker
}

const (
	nativeMapWidth  = 4096
	nativeMapHeight = 4096
)

func pxToPct(px int, total int) float64 {
	return (float64(px) / float64(total)) * 100.0
}

func NewMapStore() *MapStore {
	return &MapStore{
		playerMissionsCompleted: map[string]int{
			"ls": 3,
			"sf": 0,
			"lv": 0,
			"cp": 1,
		},
		configs: map[string]MapConfig{
			"ls": {
				Entity: "ls",
				Title:  "Los Santos & Blaine County",
				Map: MapAsset{
					Image:         "/assets/maps/loc/ls_map.jpg",
					FallbackImage: "/assets/maps/loc/fallback_map.png",
					Dimensions:    MapDimensions{Width: nativeMapWidth, Height: nativeMapHeight},
				},
				LockedAreas: []LockedArea{
					{ID: "sf", Label: "San Fierro (Locked)", X: pxToPct(1024, nativeMapWidth), Y: pxToPct(341, nativeMapHeight), Width: pxToPct(682, nativeMapWidth), Height: pxToPct(512, nativeMapHeight), Condition: "mission>=5", DependsOn: "ls"},
				},
			},
			"cp": {
				Entity: "cp",
				Title:  "Cayo Perico Island",
				Map: MapAsset{
					Image:         "/assets/maps/loc/cp_map.jpg",
					FallbackImage: "/assets/maps/loc/fallback_map.png",
					Dimensions:    MapDimensions{Width: nativeMapWidth, Height: nativeMapHeight},
				},
				LockedAreas: []LockedArea{},
			},
			"sa": {
				Entity: "sa",
				Title:  "San Andreas State",
				Map: MapAsset{
					Image:         "/assets/maps/loc/sa_map.jpg",
					FallbackImage: "/assets/maps/loc/fallback_map.png",
					Dimensions:    MapDimensions{Width: nativeMapWidth, Height: nativeMapHeight},
				},
				LockedAreas: []LockedArea{},
			},
		},
		markers: map[string][]LocationMarker{
			"ls": {
				{
					ID:          "m1",
					Name:        "Maze Bank Tower",
					Category:    "property",
					X:           pxToPct(1986, nativeMapWidth),
					Y:           pxToPct(2551, nativeMapHeight),
					Icon:        "🏢",
					IconURL:     "/assets/maps/legends/cafe_food.png",
					Description: "Executive office building located in Pillbox Hill.",
					MembersOnly: false,
					Details:     LocationDetails{Address: "Pillbox Hill, Downtown Los Santos", Price: 4000000},
				},
				{
					ID:          "m2",
					Name:        "FIB Building Secret Cache",
					Category:    "intel",
					X:           pxToPct(2097, nativeMapWidth),
					Y:           pxToPct(2461, nativeMapHeight),
					Icon:        "🔒",
					IconURL:     "/assets/maps/legends/safe_house.png",
					Description: "Confidential intel cache.",
					MembersOnly: true,
					Details:     LocationDetails{IntelData: "Encrypted heist plans stored on floor 47."},
				},
				{
					ID:          "m3",
					Name:        "Ammu-Nation",
					Category:    "shop",
					X:           pxToPct(1638, nativeMapWidth),
					Y:           pxToPct(1228, nativeMapHeight),
					Icon:        "🔫",
					IconURL:     "/assets/maps/legends/petrol_pump.png",
					Description: "Firearms and armor retailer.",
					MembersOnly: false,
				},
			},
			"cp": {
				{
					ID:          "m4",
					Name:        "El Rubio's Compound",
					Category:    "mission",
					X:           pxToPct(2048, nativeMapWidth),
					Y:           pxToPct(3072, nativeMapHeight),
					Icon:        "🏰",
					Description: "Main compound area for the Cayo Perico Heist.",
					MembersOnly: true,
					Details:     LocationDetails{IntelData: "Drainage pipe compound entry open."},
				},
			},
		},
	}
}

var DefaultStore = NewMapStore()

// --- Handlers ---

func GetGtaMap(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	entity := r.URL.Query().Get("entity")
	if entity == "" {
		entity = "ls"
	}

	isAuthenticated := r.URL.Query().Get("auth") == "true"

	DefaultStore.mu.RLock()
	cfg, ok := DefaultStore.configs[entity]
	if !ok {
		DefaultStore.mu.RUnlock()
		utils.RespondWithJSON(w, http.StatusNotFound, APIResponse{Success: false, Error: fmt.Sprintf("entity '%s' not found", entity)})
		return
	}

	progressCopy := make(map[string]int, len(DefaultStore.playerMissionsCompleted))
	for k, v := range DefaultStore.playerMissionsCompleted {
		progressCopy[k] = v
	}

	rawMarkers := DefaultStore.markers[entity]
	DefaultStore.mu.RUnlock()

	// Filter locks
	var activeLocks []LockedArea
	for _, area := range cfg.LockedAreas {
		if !isUnlockedForEntity(area, progressCopy, entity) {
			activeLocks = append(activeLocks, area)
		}
	}

	// Process markers (Sanitize sensitive data if unauthorized)
	processedMarkers := make([]LocationMarker, 0, len(rawMarkers))
	for _, marker := range rawMarkers {
		m := marker
		if m.MembersOnly && !isAuthenticated {
			m.Details.IntelData = ""
		}
		processedMarkers = append(processedMarkers, m)
	}

	utils.RespondWithJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: MapResponseData{
			Entity:         cfg.Entity,
			Title:          cfg.Title,
			Map:            cfg.Map,
			Locations:      processedMarkers,
			LockedAreas:    activeLocks,
			PlayerProgress: progressCopy,
		},
	})
}

func UpdatePlayerProgress(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	entity := r.URL.Query().Get("entity")
	if entity == "" {
		entity = "ls"
	}

	DefaultStore.mu.Lock()
	defer DefaultStore.mu.Unlock()

	if _, ok := DefaultStore.configs[entity]; !ok {
		utils.RespondWithJSON(w, http.StatusBadRequest, APIResponse{Success: false, Error: "invalid entity"})
		return
	}

	DefaultStore.playerMissionsCompleted[entity]++
	newVal := DefaultStore.playerMissionsCompleted[entity]

	utils.RespondWithJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"entity":            entity,
			"missionsCompleted": newVal,
		},
	})
}

func GetPlayerProgress(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	entity := r.URL.Query().Get("entity")

	DefaultStore.mu.RLock()
	defer DefaultStore.mu.RUnlock()

	if entity != "" {
		val, ok := DefaultStore.playerMissionsCompleted[entity]
		if !ok {
			utils.RespondWithJSON(w, http.StatusBadRequest, APIResponse{Success: false, Error: "invalid entity"})
			return
		}
		utils.RespondWithJSON(w, http.StatusOK, APIResponse{
			Success: true,
			Data: map[string]interface{}{
				"entity":            entity,
				"missionsCompleted": val,
			},
		})
		return
	}

	progressCopy := make(map[string]int, len(DefaultStore.playerMissionsCompleted))
	for k, v := range DefaultStore.playerMissionsCompleted {
		progressCopy[k] = v
	}

	utils.RespondWithJSON(w, http.StatusOK, APIResponse{Success: true, Data: progressCopy})
}

func isUnlockedForEntity(area LockedArea, progress map[string]int, currentEntity string) bool {
	checkEntity := area.DependsOn
	if checkEntity == "" {
		checkEntity = currentEntity
	}

	val := progress[checkEntity]

	if area.DependsOn != "" && progress[area.DependsOn] == 0 {
		return false
	}

	if strings.HasPrefix(area.Condition, "mission>=") {
		nStr := strings.TrimPrefix(area.Condition, "mission>=")
		if n, err := strconv.Atoi(nStr); err == nil {
			return val >= n
		}
		return false
	}

	return true
}
