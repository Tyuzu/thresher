package maps

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"naevis/utils"

	"github.com/gorilla/websocket"
)

// --- Domain Structs ---

type MapDimensions struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}

type MapAsset struct {
	Image         string        `json:"image"`
	FallbackImage string        `json:"fallbackimage"`
	Dimensions    MapDimensions `json:"dimensions"`
}

// FEATURE: Multi-Floor / Interior Layer Support
type InteriorFloor struct {
	Level     int              `json:"level"` // e.g., -1 for basement, 1 for ground floor
	Name      string           `json:"name"`  // e.g., "Executive Suite", "Sub-Basement Vault"
	Image     string           `json:"image"` // Map overlay path for this floor
	Locations []LocationMarker `json:"locations,omitempty"`
}

type LocationDetails struct {
	Address   string `json:"address,omitempty"`
	Price     int    `json:"price,omitempty"`
	IntelData string `json:"inteldata,omitempty"`
}

type LiveEvent struct {
	IsLive           bool      `json:"islive"`
	EventName        string    `json:"eventname,omitempty"`
	EndsAt           time.Time `json:"endsat,omitempty"`
	RemainingSecs    int64     `json:"remainingsecs,omitempty"`
	RewardMultiplier float64   `json:"rewardmultiplier,omitempty"`
}

type LocationMarker struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	Category    string          `json:"category"`
	X           float64         `json:"x"`
	Y           float64         `json:"y"`
	FloorLevel  *int            `json:"floorlevel,omitempty"` // Floor identifier for interior markers
	Icon        string          `json:"icon,omitempty"`
	IconURL     string          `json:"iconurl,omitempty"`
	Description string          `json:"description"`
	MembersOnly bool            `json:"membersonly"`
	Details     LocationDetails `json:"details,omitempty"`
	LiveEvent   *LiveEvent      `json:"liveevent,omitempty"`
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

type Point2D struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type Territory struct {
	ID            string    `json:"id"`
	GangName      string    `json:"gangname"`
	Color         string    `json:"color"`
	ControlPct    float64   `json:"controlpct"`
	PolygonPoints []Point2D `json:"polygonpoints"`
}

type CategoryFilter struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Icon  string `json:"icon"`
	Count int    `json:"count"`
}

type MapConfig struct {
	Entity      string          `json:"entity"`
	Title       string          `json:"title"`
	Map         MapAsset        `json:"map"`
	LockedAreas []LockedArea    `json:"lockedareas"`
	Floors      []InteriorFloor `json:"floors,omitempty"` // Multi-floor configurations
}

type MapResponseData struct {
	Entity         string           `json:"entity"`
	Title          string           `json:"title"`
	Map            MapAsset         `json:"map"`
	Categories     []CategoryFilter `json:"categories"`
	Locations      []LocationMarker `json:"locations"`
	Territories    []Territory      `json:"territories,omitempty"`
	LockedAreas    []LockedArea     `json:"lockedareas,omitempty"`
	Floors         []InteriorFloor  `json:"floors,omitempty"`
	PlayerProgress map[string]int   `json:"playerprogress"`
	Permalink      *PermalinkInfo   `json:"permalink,omitempty"` // Deep-link context
}

// FEATURE: Deep-Linking & Permalinks Struct
type PermalinkInfo struct {
	URL        string  `json:"url"`
	TargetID   string  `json:"targetid,omitempty"`
	Entity     string  `json:"entity"`
	Zoom       int     `json:"zoom"`
	FocusPoint Point2D `json:"focuspoint"`
	FloorLevel *int    `json:"floorlevel,omitempty"`
}

// FEATURE: Real-Time Player & Vehicle Tracking Structs
type LiveEntity struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"` // "player", "vehicle", "police", "aircraft"
	Name      string    `json:"name"`
	Position  Point2D   `json:"position"`
	Heading   float64   `json:"heading"` // 0–360 degrees
	Speed     float64   `json:"speed"`   // km/h
	Occupants int       `json:"occupants"`
	Floor     int       `json:"floor"`
	Updated   time.Time `json:"updated"`
}

type LiveTrackHub struct {
	clients    map[*websocket.Conn]bool
	broadcast  chan LiveEntity
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
	mu         sync.RWMutex
	entities   map[string]LiveEntity
}

type MeasureResponse struct {
	DistanceMeters  float64 `json:"distancemeters"`
	DistanceMiles   float64 `json:"distancemiles"`
	EstimatedTravel string  `json:"estimatedtravel"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// --- WebSocket Upgrader ---

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for game overlays; restrict in production
	},
}

// --- Thread-Safe Store ---

type MapStore struct {
	mu                      sync.RWMutex
	playerMissionsCompleted map[string]int
	configs                 map[string]MapConfig
	markers                 map[string][]LocationMarker
	territories             map[string][]Territory
	Hub                     *LiveTrackHub
}

const (
	nativeMapWidth   = 4096
	nativeMapHeight  = 4096
	metersPerPctUnit = 50.0
)

func pxToPct(px int, total int) float64 {
	return (float64(px) / float64(total)) * 100.0
}

func NewLiveTrackHub() *LiveTrackHub {
	hub := &LiveTrackHub{
		clients:    make(map[*websocket.Conn]bool),
		broadcast:  make(chan LiveEntity, 100),
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
		entities:   make(map[string]LiveEntity),
	}
	go hub.run()
	return hub
}

func (h *LiveTrackHub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				client.Close()
			}
			h.mu.Unlock()
		case entity := <-h.broadcast:
			h.mu.Lock()
			h.entities[entity.ID] = entity
			payload, _ := json.Marshal(map[string]interface{}{
				"type": "entity_update",
				"data": entity,
			})
			for client := range h.clients {
				err := client.WriteMessage(websocket.TextMessage, payload)
				if err != nil {
					client.Close()
					delete(h.clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

func NewMapStore() *MapStore {
	now := time.Now()
	floor1Level := 1
	floor2Level := 2

	return &MapStore{
		Hub: NewLiveTrackHub(),
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
				// FEATURE: Multi-Floor / Interior Maps Setup
				Floors: []InteriorFloor{
					{
						Level: 1,
						Name:  "Maze Bank Lobby & Concourse",
						Image: "/assets/maps/interiors/ls_maze_lobby.jpg",
						Locations: []LocationMarker{
							{ID: "m1_f1_1", Name: "Security Desk", Category: "intel", X: 50.0, Y: 50.0, FloorLevel: &floor1Level, Description: "Lobby main keycard desk."},
						},
					},
					{
						Level: 2,
						Name:  "Maze Bank Executive Office",
						Image: "/assets/maps/interiors/ls_maze_exec.jpg",
						Locations: []LocationMarker{
							{ID: "m1_f2_1", Name: "CEO Safe", Category: "intel", X: 45.2, Y: 38.9, FloorLevel: &floor2Level, Description: "Main vault safe inside CEO suite."},
						},
					},
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
		},
		territories: map[string][]Territory{
			"ls": {
				{ID: "t1", GangName: "Chamberlain Gang Families", Color: "rgba(34, 197, 94, 0.4)", ControlPct: 82.5, PolygonPoints: []Point2D{{X: 42.5, Y: 58.0}, {X: 48.0, Y: 58.0}, {X: 49.2, Y: 64.5}, {X: 41.8, Y: 64.0}}},
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
					ID:          "m_event_1",
					Name:        "Fort Zancudo Armored Convoy",
					Category:    "live_event",
					X:           pxToPct(1150, nativeMapWidth),
					Y:           pxToPct(1820, nativeMapHeight),
					Icon:        "💀",
					IconURL:     "/assets/maps/legends/event_boss.png",
					Description: "High-value military transport convoy carrying experimental weapons.",
					MembersOnly: false,
					LiveEvent: &LiveEvent{
						IsLive:           true,
						EventName:        "Military Supply Intercept",
						EndsAt:           now.Add(45 * time.Minute),
						RewardMultiplier: 2.5,
					},
				},
			},
		},
	}
}

var DefaultStore = NewMapStore()

// --- Handlers ---

func GetGtaMap(w http.ResponseWriter, r *http.Request) {
	entity := r.URL.Query().Get("entity")
	if entity == "" {
		entity = "ls"
	}

	filterCat := r.URL.Query().Get("category")
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
	territories := DefaultStore.territories[entity]
	DefaultStore.mu.RUnlock()

	var activeLocks []LockedArea
	for _, area := range cfg.LockedAreas {
		if !isUnlockedForEntity(area, progressCopy, entity) {
			activeLocks = append(activeLocks, area)
		}
	}

	catCounts := make(map[string]int)
	now := time.Now()

	processedMarkers := make([]LocationMarker, 0, len(rawMarkers))
	for _, marker := range rawMarkers {
		m := marker
		catCounts[m.Category]++

		if filterCat != "" && filterCat != "all" && m.Category != filterCat {
			continue
		}

		if m.MembersOnly && !isAuthenticated {
			m.Details.IntelData = ""
		}

		if m.LiveEvent != nil && m.LiveEvent.IsLive {
			rem := m.LiveEvent.EndsAt.Sub(now)
			if rem > 0 {
				m.LiveEvent.RemainingSecs = int64(rem.Seconds())
			} else {
				m.LiveEvent.IsLive = false
				m.LiveEvent.RemainingSecs = 0
			}
		}

		processedMarkers = append(processedMarkers, m)
	}

	categories := []CategoryFilter{
		{ID: "all", Label: "All Icons", Icon: "🌐", Count: len(rawMarkers)},
		{ID: "property", Label: "Properties", Icon: "🏢", Count: catCounts["property"]},
		{ID: "intel", Label: "Intel & Secrets", Icon: "🔒", Count: catCounts["intel"]},
		{ID: "live_event", Label: "Live Events", Icon: "💀", Count: catCounts["live_event"]},
	}

	// FEATURE: Deep-Linking & Permalinks Resolution
	var permalink *PermalinkInfo
	targetMarkerID := r.URL.Query().Get("marker")
	xStr := r.URL.Query().Get("x")
	yStr := r.URL.Query().Get("y")
	floorStr := r.URL.Query().Get("floor")

	if targetMarkerID != "" || (xStr != "" && yStr != "") {
		zoom, _ := strconv.Atoi(r.URL.Query().Get("zoom"))
		if zoom == 0 {
			zoom = 4 // Default focus zoom level
		}

		focusX, _ := strconv.ParseFloat(xStr, 64)
		focusY, _ := strconv.ParseFloat(yStr, 64)

		if targetMarkerID != "" {
			for _, m := range processedMarkers {
				if m.ID == targetMarkerID {
					focusX = m.X
					focusY = m.Y
					break
				}
			}
		}

		var floorPtr *int
		if floorStr != "" {
			if fVal, err := strconv.Atoi(floorStr); err == nil {
				floorPtr = &fVal
			}
		}

		permalink = &PermalinkInfo{
			URL:        r.URL.String(),
			TargetID:   targetMarkerID,
			Entity:     entity,
			Zoom:       zoom,
			FocusPoint: Point2D{X: focusX, Y: focusY},
			FloorLevel: floorPtr,
		}
	}

	utils.RespondWithJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: MapResponseData{
			Entity:         cfg.Entity,
			Title:          cfg.Title,
			Map:            cfg.Map,
			Categories:     categories,
			Locations:      processedMarkers,
			Territories:    territories,
			LockedAreas:    activeLocks,
			Floors:         cfg.Floors,
			PlayerProgress: progressCopy,
			Permalink:      permalink,
		},
	})
}

// FEATURE: Real-Time Player & Vehicle Tracking WebSocket Handler
func HandleLiveTrackingWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Could not open websocket connection", http.StatusBadRequest)
		return
	}

	DefaultStore.Hub.register <- conn

	// Send initial state batch
	DefaultStore.Hub.mu.RLock()
	initialEntities := make([]LiveEntity, 0, len(DefaultStore.Hub.entities))
	for _, entity := range DefaultStore.Hub.entities {
		initialEntities = append(initialEntities, entity)
	}
	DefaultStore.Hub.mu.RUnlock()

	conn.WriteJSON(map[string]interface{}{
		"type": "initial_state",
		"data": initialEntities,
	})

	// Reader loop (handles incoming player position broadcasts from game client/bridge)
	go func() {
		defer func() {
			DefaultStore.Hub.unregister <- conn
		}()

		for {
			var entity LiveEntity
			err := conn.ReadJSON(&entity)
			if err != nil {
				break
			}
			entity.Updated = time.Now()
			DefaultStore.Hub.broadcast <- entity
		}
	}()
}

// FEATURE: Measurement Distance Calculation Endpoint
func CalculateDistance(w http.ResponseWriter, r *http.Request) {
	x1Str := r.URL.Query().Get("x1")
	y1Str := r.URL.Query().Get("y1")
	x2Str := r.URL.Query().Get("x2")
	y2Str := r.URL.Query().Get("y2")

	x1, err1 := strconv.ParseFloat(x1Str, 64)
	y1, err2 := strconv.ParseFloat(y1Str, 64)
	x2, err3 := strconv.ParseFloat(x2Str, 64)
	y2, err4 := strconv.ParseFloat(y2Str, 64)

	if err1 != nil || err2 != nil || err3 != nil || err4 != nil {
		utils.RespondWithJSON(w, http.StatusBadRequest, APIResponse{Success: false, Error: "invalid coordinates provided"})
		return
	}

	dx := x2 - x1
	dy := y2 - y1
	pctDistance := math.Sqrt(dx*dx + dy*dy)

	meters := pctDistance * metersPerPctUnit
	miles := meters / 1609.34
	seconds := meters / 25.0

	var timeStr string
	if seconds < 60 {
		timeStr = fmt.Sprintf("%.0fs", seconds)
	} else {
		timeStr = fmt.Sprintf("%.1fm", seconds/60.0)
	}

	utils.RespondWithJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data: MeasureResponse{
			DistanceMeters:  math.Round(meters*10) / 10,
			DistanceMiles:   math.Round(miles*100) / 100,
			EstimatedTravel: timeStr,
		},
	})
}

func UpdatePlayerProgress(w http.ResponseWriter, r *http.Request) {
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

func GetPlayerProgress(w http.ResponseWriter, r *http.Request) {
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
