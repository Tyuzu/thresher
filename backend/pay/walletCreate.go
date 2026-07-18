package pay

import (
	"context"
	"errors"
	"naevis/models"
	"naevis/utils"
	"net/http"
	"time"

	"github.com/julienschmidt/httprouter"
)

// CreateWallet explicitly provisions an account for an onboarded user
func (p *PaymentService) CreateWallet(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	userID := utils.GetUserIDFromRequest(r)

	// Check if account already exists
	var existing models.Account
	err := p.app.DB.FindOne(ctx, accountsCollection, map[string]any{"userid": userID}, &existing)
	if err == nil {
		utils.RespondWithError(w, http.StatusConflict, "wallet already exists")
		return
	}

	if !p.userExists(ctx, userID) {
		utils.RespondWithError(w, http.StatusBadRequest, "user does not exist")
		return
	}

	newAcc := models.Account{
		ID:            utils.GetUUID(),
		UserID:        userID,
		Currency:      "INR",
		Status:        "active",
		CachedBalance: 0,
		Version:       1,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := p.app.DB.InsertOne(ctx, accountsCollection, newAcc); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "failed to create wallet")
		return
	}

	utils.RespondWithJSON(w, http.StatusCreated, map[string]any{"success": true, "account_id": newAcc.ID})
}

// GetAccountStrict retrieves an account or returns an error if not found (No lazy generation!)
func (p *PaymentService) GetAccountStrict(ctx context.Context, userID string) (string, error) {
	var acc models.Account
	err := p.app.DB.FindOne(ctx, accountsCollection, map[string]any{"userid": userID}, &acc)
	if err != nil {
		return "", errors.New("account_not_found")
	}
	return acc.ID, nil
}
