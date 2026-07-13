package cart

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"time"

	"naevis/config"
	"naevis/infra"
	"naevis/infra/db"
	"naevis/infra/mq"
	"naevis/models"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func TestCartHandlers(t *testing.T) {
	tests := []struct {
		name            string
		handler         func(*infra.Deps) httprouter.Handle
		method          string
		path            string
		body            string
		userID          string
		setup           func(*stubDB)
		wantStatus      int
		wantBodyContain string
	}{
		{
			name:       "GetCart requires auth",
			handler:    GetCart,
			method:     http.MethodGet,
			path:       "/cart",
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:            "GetCart returns grouped cart",
			handler:         GetCart,
			method:          http.MethodGet,
			path:            "/cart",
			userID:          "user-1",
			wantStatus:      http.StatusOK,
			wantBodyContain: "products",
			setup: func(s *stubDB) {
				s.cartItems = []models.CartItem{{UserID: "user-1", Category: "products", ItemID: "sku-1", ItemName: "Tea", Quantity: 2}}
			},
		},
		{
			name:            "AddToCart succeeds",
			handler:         AddToCart,
			method:          http.MethodPost,
			path:            "/cart/add",
			userID:          "user-1",
			body:            `{"itemId":"sku-1","quantity":2}`,
			wantStatus:      http.StatusCreated,
			wantBodyContain: "status",
			setup: func(s *stubDB) {
				s.products = map[string]map[string]any{"sku-1": {"Name": "Tea", "Type": "drink", "Price": 10.0, "Discount": 0.0, "Unit": "pack", "Quantity": 10}}
			},
		},
		{
			name:            "UpdateCart persists items",
			handler:         UpdateCart,
			method:          http.MethodPut,
			path:            "/cart",
			userID:          "user-1",
			body:            `{"items":[{"itemId":"sku-1","quantity":1}]}`,
			wantStatus:      http.StatusOK,
			wantBodyContain: "sku-1",
			setup: func(s *stubDB) {
				s.products = map[string]map[string]any{"sku-1": {"Name": "Tea", "Type": "drink", "Price": 10.0, "Discount": 0.0, "Unit": "pack", "Quantity": 10}}
			},
		},
		{
			name:            "UpdateItemQuantity returns updated cart",
			handler:         UpdateItemQuantity,
			method:          http.MethodPatch,
			path:            "/cart/item",
			userID:          "user-1",
			body:            `{"itemId":"sku-1","category":"products","quantity":3}`,
			wantStatus:      http.StatusOK,
			wantBodyContain: "products",
			setup: func(s *stubDB) {
				s.cartItems = []models.CartItem{{UserID: "user-1", Category: "products", ItemID: "sku-1", ItemName: "Tea", Quantity: 1}}
				s.products = map[string]map[string]any{"sku-1": {"Name": "Tea", "Type": "drink", "Price": 10.0, "Discount": 0.0, "Unit": "pack", "Quantity": 10}}
			},
		},
		{
			name:            "RemoveFromCart deletes item",
			handler:         RemoveFromCart,
			method:          http.MethodDelete,
			path:            "/cart/item",
			userID:          "user-1",
			body:            `{"itemId":"sku-1","category":"products"}`,
			wantStatus:      http.StatusOK,
			wantBodyContain: "{}",
			setup: func(s *stubDB) {
				s.cartItems = []models.CartItem{{UserID: "user-1", Category: "products", ItemID: "sku-1", ItemName: "Tea", Quantity: 1}}
			},
		},
		{
			name:            "ClearCart removes all items",
			handler:         ClearCart,
			method:          http.MethodDelete,
			path:            "/cart",
			userID:          "user-1",
			wantStatus:      http.StatusOK,
			wantBodyContain: "Cart cleared",
			setup: func(s *stubDB) {
				s.cartItems = []models.CartItem{{UserID: "user-1", Category: "products", ItemID: "sku-1", ItemName: "Tea", Quantity: 1}}
			},
		},
		{
			name:            "InitiateCheckout returns cart summary",
			handler:         InitiateCheckout,
			method:          http.MethodPost,
			path:            "/checkout/initiate",
			userID:          "user-1",
			wantStatus:      http.StatusOK,
			wantBodyContain: "items",
			setup: func(s *stubDB) {
				s.cartItems = []models.CartItem{{UserID: "user-1", Category: "products", ItemID: "sku-1", ItemName: "Tea", Quantity: 1}}
			},
		},
		{
			name:            "CreateCheckoutSession returns session",
			handler:         CreateCheckoutSession,
			method:          http.MethodPost,
			path:            "/checkout/session",
			userID:          "user-1",
			body:            `{"address":"1 Main St","items":{"products":[{"itemId":"sku-1","quantity":1}]}}`,
			wantStatus:      http.StatusCreated,
			wantBodyContain: "subtotal",
			setup: func(s *stubDB) {
				s.products = map[string]map[string]any{"sku-1": {"Name": "Tea", "Type": "drink", "Price": 10.0, "Discount": 0.0, "Unit": "pack", "Quantity": 10}}
			},
		},
		{
			name:            "GetMyOrders returns paged orders",
			handler:         GetMyOrders,
			method:          http.MethodGet,
			path:            "/orders/me",
			userID:          "user-1",
			wantStatus:      http.StatusOK,
			wantBodyContain: "orders",
			setup: func(s *stubDB) {
				s.orders = []models.Order{{OrderID: "order-1", UserID: "user-1", Status: "pending", Total: 1000, CreatedAt: time.Now()}}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			stub := &stubDB{}
			if tt.setup != nil {
				tt.setup(stub)
			}

			app := &infra.Deps{DB: stub, MQ: &stubMQ{}}
			req := httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
			if tt.userID != "" {
				req = req.WithContext(context.WithValue(req.Context(), config.UserIDKey, tt.userID))
			}
			rec := httptest.NewRecorder()

			tt.handler(app)(rec, req, nil)

			if rec.Code != tt.wantStatus {
				t.Fatalf("expected status %d, got %d with body %s", tt.wantStatus, rec.Code, rec.Body.String())
			}
			if tt.wantBodyContain != "" && !strings.Contains(rec.Body.String(), tt.wantBodyContain) {
				t.Fatalf("expected body to contain %q, got %s", tt.wantBodyContain, rec.Body.String())
			}
		})
	}
}

type stubDB struct {
	db.Database
	products  map[string]map[string]any
	cartItems []models.CartItem
	orders    []models.Order
}

func (s *stubDB) FindOne(ctx context.Context, collection string, filter any, result any) error {
	if collection == "products" {
		if s.products == nil {
			return errors.New("not found")
		}
		filterMap, ok := filter.(bson.M)
		if !ok {
			return errors.New("unsupported filter")
		}
		productID, _ := filterMap["productid"].(string)
		data, ok := s.products[productID]
		if !ok {
			return errors.New("not found")
		}
		return setMapFields(result, data)
	}
	return errors.New("not found")
}

func (s *stubDB) FindMany(ctx context.Context, collection string, filter any, result any, opts ...*options.FindOptions) error {
	if collection == cartCollection {
		items := reflect.ValueOf(result)
		if items.Kind() != reflect.Ptr || items.Elem().Kind() != reflect.Slice {
			return errors.New("bad result")
		}
		out := reflect.MakeSlice(items.Elem().Type(), 0, len(s.cartItems))
		for _, item := range s.cartItems {
			if filterMap, ok := filter.(bson.M); ok {
				if userID, ok := filterMap["userId"].(string); ok && userID != "" && item.UserID != userID {
					continue
				}
				if category, ok := filterMap["category"].(string); ok && category != "" && item.Category != category {
					continue
				}
			}
			out = reflect.Append(out, reflect.ValueOf(item))
		}
		items.Elem().Set(out)
		return nil
	}
	if collection == ordersCollection {
		items := reflect.ValueOf(result)
		if items.Kind() != reflect.Ptr || items.Elem().Kind() != reflect.Slice {
			return errors.New("bad result")
		}
		out := reflect.MakeSlice(items.Elem().Type(), 0, len(s.orders))
		for _, order := range s.orders {
			if filterMap, ok := filter.(bson.M); ok {
				if userID, ok := filterMap["userId"].(string); ok && userID != "" && order.UserID != userID {
					continue
				}
			}
			out = reflect.Append(out, reflect.ValueOf(order))
		}
		items.Elem().Set(out)
		return nil
	}
	return nil
}

func (s *stubDB) InsertMany(ctx context.Context, collection string, documents []any) error {
	if collection != cartCollection {
		return nil
	}
	for _, doc := range documents {
		if item, ok := doc.(models.CartItem); ok {
			s.cartItems = append(s.cartItems, item)
		}
	}
	return nil
}

func (s *stubDB) Upsert(ctx context.Context, collection string, filter any, document any) error {
	if collection != cartCollection {
		return nil
	}
	filterMap, _ := filter.(bson.M)
	item := models.CartItem{}
	if docMap, ok := document.(bson.M); ok {
		if inc, ok := docMap["$inc"].(bson.M); ok {
			if qty, ok := inc["quantity"].(int); ok {
				item.Quantity = qty
			}
		}
		if set, ok := docMap["$set"].(bson.M); ok {
			if name, ok := set["itemName"].(string); ok {
				item.ItemName = name
			}
			if category, ok := set["category"].(string); ok {
				item.Category = category
			}
			if price, ok := set["price"].(int64); ok {
				item.Price = price
			}
			if entityID, ok := set["entityId"].(string); ok {
				item.EntityID = entityID
			}
			if entityType, ok := set["entityType"].(string); ok {
				item.EntityType = entityType
			}
		}
	}
	item.UserID, _ = filterMap["userId"].(string)
	item.ItemID, _ = filterMap["itemId"].(string)
	item.EntityID, _ = filterMap["entityId"].(string)
	if existing := findCartItemByFilter(s.cartItems, filterMap); existing != nil {
		existing.Quantity += item.Quantity
		if item.ItemName != "" {
			existing.ItemName = item.ItemName
		}
		if item.Category != "" {
			existing.Category = item.Category
		}
		if item.Price != 0 {
			existing.Price = item.Price
		}
		if item.EntityID != "" {
			existing.EntityID = item.EntityID
		}
		if item.EntityType != "" {
			existing.EntityType = item.EntityType
		}
		return nil
	}
	s.cartItems = append(s.cartItems, item)
	return nil
}

func (s *stubDB) Update(ctx context.Context, collection string, filter any, update any) error {
	if collection != cartCollection {
		return nil
	}
	filterMap, _ := filter.(bson.M)
	if existing := findCartItemByFilter(s.cartItems, filterMap); existing != nil {
		if updateMap, ok := update.(bson.M); ok {
			if set, ok := updateMap["$set"].(bson.M); ok {
				if qty, ok := set["quantity"].(int); ok {
					existing.Quantity = qty
				}
			}
		}
	}
	return nil
}

func (s *stubDB) Delete(ctx context.Context, collection string, filter any) (int64, error) {
	if collection != cartCollection {
		return 0, nil
	}
	filterMap, _ := filter.(bson.M)
	kept := s.cartItems[:0]
	for _, item := range s.cartItems {
		if matchesCartFilter(item, filterMap) {
			continue
		}
		kept = append(kept, item)
	}
	s.cartItems = kept
	return int64(len(kept)), nil
}

func findCartItemByFilter(items []models.CartItem, filter bson.M) *models.CartItem {
	for i := range items {
		if matchesCartFilter(items[i], filter) {
			return &items[i]
		}
	}
	return nil
}

func matchesCartFilter(item models.CartItem, filter bson.M) bool {
	if filter == nil {
		return true
	}
	if userID, ok := filter["userId"].(string); ok && userID != "" && item.UserID != userID {
		return false
	}
	if itemID, ok := filter["itemId"].(string); ok && itemID != "" && item.ItemID != itemID {
		return false
	}
	if category, ok := filter["category"].(string); ok && category != "" && item.Category != category {
		return false
	}
	if entityID, ok := filter["entityId"].(string); ok && entityID != "" && item.EntityID != entityID {
		return false
	}
	if entityType, ok := filter["entityType"].(string); ok && entityType != "" && item.EntityType != entityType {
		return false
	}
	return true
}

func setMapFields(result any, values map[string]any) error {
	v := reflect.ValueOf(result)
	if v.Kind() != reflect.Ptr || v.Elem().Kind() != reflect.Struct {
		return errors.New("invalid result")
	}
	for fieldName, val := range values {
		field := v.Elem().FieldByName(fieldName)
		if !field.IsValid() || !field.CanSet() {
			continue
		}
		switch field.Kind() {
		case reflect.String:
			if str, ok := val.(string); ok {
				field.SetString(str)
			}
		case reflect.Int:
			if num, ok := val.(int); ok {
				field.SetInt(int64(num))
			}
		case reflect.Int64:
			if num, ok := val.(int64); ok {
				field.SetInt(num)
			} else if num, ok := val.(int); ok {
				field.SetInt(int64(num))
			}
		case reflect.Float64:
			if num, ok := val.(float64); ok {
				field.SetFloat(num)
			}
		}
	}
	return nil
}

type stubMQ struct{}

func (s *stubMQ) Publish(ctx context.Context, subject string, data []byte) error { return nil }
func (s *stubMQ) Ping(ctx context.Context) error                                 { return nil }
func (s *stubMQ) Subscribe(ctx context.Context, subject string, handler mq.MessageHandler) (mq.Subscription, error) {
	return stubSub{}, nil
}
func (s *stubMQ) QueueSubscribe(ctx context.Context, subject string, queue string, handler mq.MessageHandler) (mq.Subscription, error) {
	return stubSub{}, nil
}

type stubSub struct{}

func (s stubSub) Unsubscribe() error { return nil }

func Example() {}

func TestUnused(t *testing.T) {}

func init() {
	_ = fmt.Sprintf("%v", http.StatusOK)
	_, _ = json.Marshal(map[string]any{})
	_ = reflect.TypeOf(&models.CartItem{})
}
