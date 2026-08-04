package cart

import (
	"encoding/json"
	"net/http"
	"strconv"

	"naevis/cart/domain"
	"naevis/cart/repo"
	"naevis/cart/usecase"
	"naevis/infra"
	"naevis/models"
	"naevis/utils"
)

type CartHandler struct {
	uc *usecase.CartUseCase
}

func NewCartHandler(app *infra.Deps) *CartHandler {
	repoImpl := repo.NewMongoRepo(app.DB)
	uc := usecase.NewCartUseCase(repoImpl, repoImpl, repoImpl, repoImpl, repoImpl, repoImpl, app.MQ)
	return &CartHandler{uc: uc}
}

func (h *CartHandler) AddToCart() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var item models.CartItem
		if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}
		validated, err := domain.ValidateAddToCartRequest(domain.AddToCartRequest{
			ItemID:     item.ItemID,
			Category:   item.Category,
			Quantity:   item.Quantity,
			EntityID:   item.EntityID,
			EntityType: item.EntityType,
		})
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		item.ItemID = validated.ItemID
		item.Category = validated.Category
		item.Quantity = validated.Quantity
		item.EntityID = validated.EntityID
		item.EntityType = validated.EntityType

		if err := h.uc.AddToCart(ctx, userID, item); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		utils.RespondWithJSON(w, http.StatusCreated, map[string]string{"status": "ok"})
	}
}

func (h *CartHandler) UpdateCart() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var payload struct {
			Items []models.CartItem `json:"items"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		updated, err := h.uc.UpdateCart(ctx, userID, payload.Items)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, updated)
	}
}

func (h *CartHandler) UpdateItemQuantity() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var payload struct {
			ItemID     string `json:"itemid"`
			Category   string `json:"category"`
			Quantity   int    `json:"quantity"`
			EntityID   string `json:"entityid,omitempty"`
			EntityType string `json:"entitytype,omitempty"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}
		validated, err := domain.ValidateUpdateQuantityRequest(domain.UpdateQuantityRequest{
			ItemID:     payload.ItemID,
			Category:   payload.Category,
			Quantity:   payload.Quantity,
			EntityID:   payload.EntityID,
			EntityType: payload.EntityType,
		})
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		payload.ItemID = validated.ItemID
		payload.Category = validated.Category
		payload.Quantity = validated.Quantity
		payload.EntityID = validated.EntityID
		payload.EntityType = validated.EntityType

		groupedCart, err := h.uc.UpdateItemQuantity(ctx, userID, payload.ItemID, payload.Category, payload.Quantity, payload.EntityID, payload.EntityType)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, groupedCart)
	}
}

func (h *CartHandler) GetCart() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		category := r.URL.Query().Get("category")
		groupedCart, err := h.uc.GetCart(ctx, userID, category)
		if err != nil {
			http.Error(w, "Failed to fetch cart", http.StatusInternalServerError)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, groupedCart)
	}
}

func (h *CartHandler) RemoveFromCart() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var req removeFromCartRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
			return
		}
		validated, err := domain.ValidateRemoveFromCartRequest(domain.RemoveFromCartRequest{
			ItemID:     req.ItemID,
			Category:   req.Category,
			EntityID:   req.EntityID,
			EntityType: req.EntityType,
		})
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		req.ItemID = validated.ItemID
		req.Category = validated.Category
		req.EntityID = validated.EntityID
		req.EntityType = validated.EntityType

		groupedCart, err := h.uc.RemoveFromCart(ctx, userID, req.ItemID, req.Category, req.EntityID, req.EntityType)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, groupedCart)
	}
}

func (h *CartHandler) ClearCart() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		if err := h.uc.ClearCart(ctx, userID); err != nil {
			http.Error(w, "Failed to clear cart", http.StatusInternalServerError)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]string{"message": "Cart cleared successfully"})
	}
}

func (h *CartHandler) InitiateCheckout() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		_, err := h.uc.InitiateCheckout(ctx, userID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, map[string]any{"status": "ok"})
	}
}

func (h *CartHandler) CreateCheckoutSession() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var payload createSessionPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		session := models.CheckoutSession{
			Address:       payload.Address,
			PaymentMethod: payload.PaymentMethod,
			Items:         payload.Items,
		}

		result, err := h.uc.CreateCheckoutSession(ctx, userID, session)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		utils.RespondWithJSON(w, http.StatusCreated, result)
	}
}

func (h *CartHandler) PlaceOrder() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var payload placeOrderRequest
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "Invalid checkout payload", http.StatusBadRequest)
			return
		}
		if err := payload.validate(); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		checkout := models.CheckoutSession{
			Address:       payload.Address,
			PaymentMethod: payload.PaymentMethod,
			Items:         payload.Items,
		}

		result, err := h.uc.PlaceOrder(ctx, userID, checkout, payload.Coupon)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		utils.RespondWithJSON(w, http.StatusCreated, result)
	}
}

func (h *CartHandler) GetMyOrders() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		userID := utils.GetUserIDFromRequest(r)
		if userID == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		skip := parseQueryInt(r, "skip", 0, 0, 10000)
		limit := parseQueryInt(r, "limit", 10, 1, 100)

		result, err := h.uc.GetMyOrders(ctx, userID, skip, limit)
		if err != nil {
			http.Error(w, "Failed to fetch orders", http.StatusInternalServerError)
			return
		}

		utils.RespondWithJSON(w, http.StatusOK, result)
	}
}

func (h *CartHandler) ValidateCouponHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req CouponRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			utils.RespondWithJSON(w, http.StatusBadRequest, CouponResponse{Valid: false, Message: "Invalid request body"})
			return
		}
		if err := req.validate(); err != nil {
			utils.RespondWithJSON(w, http.StatusBadRequest, CouponResponse{Valid: false, Message: err.Error()})
			return
		}

		coupon, err := h.uc.ValidateCouponForEntity(r.Context(), req.Code, req.EntityID, req.EntityType)
		if err != nil {
			utils.RespondWithJSON(w, http.StatusNotFound, CouponResponse{Valid: false, Message: err.Error()})
			return
		}

		discount := 0.0
		if req.Cart > 0 {
			discount = (req.Cart * coupon.Value) / 100
		}

		utils.RespondWithJSON(w, http.StatusOK, CouponResponse{Valid: true, Discount: discount, Message: "Coupon applied"})
	}
}

func parseQueryInt(r *http.Request, key string, defaultVal, minVal, maxVal int) int {
	str := r.URL.Query().Get(key)
	if str == "" {
		return defaultVal
	}
	val, err := strconv.Atoi(str)
	if err != nil || val < minVal {
		return defaultVal
	}
	if val > maxVal {
		return maxVal
	}
	return val
}
