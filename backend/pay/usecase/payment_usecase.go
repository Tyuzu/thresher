package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"naevis/config/mqevent"
	"naevis/infra"
	"naevis/infra/mq"
	"naevis/metrics/auditlog"
	"naevis/models"
	"naevis/pay/domain"
	"naevis/utils"
	log "naevis/utils/logger"
)

const (
	RefundsCollection = "refunds"
	webhookCollection = "payment_webhooks"
)

type PriceResolver func(ctx context.Context, entityID string) (int64, error)

type PaymentUseCase struct {
	app       *infra.Deps
	resolvers map[string]PriceResolver
}

type PaymentUsecase = PaymentUseCase

func NewPaymentUseCase(app *infra.Deps) *PaymentUseCase {
	p := &PaymentUseCase{app: app, resolvers: make(map[string]PriceResolver)}
	p.RegisterDefaultResolvers()
	return p
}

func NewPaymentUsecase(app *infra.Deps) *PaymentUseCase {
	return NewPaymentUseCase(app)
}

func (p *PaymentUseCase) RegisterResolver(entityType string, r PriceResolver) {
	p.resolvers[entityType] = r
}

func (p *PaymentUseCase) resolver(entityType string) (PriceResolver, error) {
	r, ok := p.resolvers[entityType]
	if !ok {
		return nil, errors.New("unsupported entity type")
	}
	return r, nil
}

func (p *PaymentUseCase) RegisterDefaultResolvers() {
	db := p.app.DB

	p.RegisterResolver("ticket", func(ctx context.Context, id string) (int64, error) {
		var t struct{ Price int64 }
		err := db.FindOne(ctx, "tickets", map[string]any{"ticketid": id}, &t)
		return t.Price, err
	})

	p.RegisterResolver("menu", func(ctx context.Context, id string) (int64, error) {
		var m struct{ Price int64 }
		err := db.FindOne(ctx, "menu", map[string]any{"menuid": id}, &m)
		return m.Price, err
	})

	p.RegisterResolver("service", func(ctx context.Context, id string) (int64, error) {
		var s struct{ Price int64 }
		err := db.FindOne(ctx, "service", map[string]any{"serviceid": id}, &s)
		return s.Price, err
	})

	p.RegisterResolver("post", func(ctx context.Context, id string) (int64, error) { return 0, nil })

	p.RegisterResolver("order", func(ctx context.Context, id string) (int64, error) {
		var o struct {
			Total int64 `bson:"total"`
		}
		err := db.FindOne(ctx, "orders", map[string]any{"orderId": id}, &o)
		if err == nil {
			return o.Total, nil
		}
		var fo struct {
			PriceAtPurchase float64 `bson:"priceAtPurchase"`
		}
		err = db.FindOne(ctx, "farmorders", map[string]any{"orderid": id}, &fo)
		if err != nil {
			return 0, err
		}
		return int64(fo.PriceAtPurchase * 100), nil
	})

	p.RegisterResolver("cart", func(ctx context.Context, id string) (int64, error) { return 0, nil })

	p.RegisterResolver("product", func(ctx context.Context, id string) (int64, error) {
		var p2 struct{ Price int64 }
		err := db.FindOne(ctx, "products", map[string]any{"productid": id}, &p2)
		return p2.Price, err
	})

	p.RegisterResolver("booking", func(ctx context.Context, id string) (int64, error) {
		var b struct{ Price int64 }
		err := db.FindOne(ctx, "bookings", map[string]any{"bookingid": id}, &b)
		return b.Price, err
	})

	p.RegisterResolver("merch", func(ctx context.Context, id string) (int64, error) {
		var m struct{ Price int64 }
		err := db.FindOne(ctx, "merch", map[string]any{"merchid": id}, &m)
		return m.Price, err
	})

	p.RegisterResolver("crop", func(ctx context.Context, id string) (int64, error) {
		var c struct{ Price int64 }
		err := db.FindOne(ctx, "crops", map[string]any{"cropid": id}, &c)
		return c.Price, err
	})

	p.RegisterResolver("farm", func(ctx context.Context, id string) (int64, error) { return 0, nil })

	p.RegisterResolver("beat", func(ctx context.Context, id string) (int64, error) {
		var b struct{ Price int64 }
		err := db.FindOne(ctx, "beats", map[string]any{"beatid": id}, &b)
		return b.Price, err
	})

	p.RegisterResolver("donation", func(ctx context.Context, id string) (int64, error) { return 0, nil })
	p.RegisterResolver("funding", func(ctx context.Context, id string) (int64, error) { return 0, nil })
}

func (p *PaymentUseCase) getOrCreateAccount(ctx context.Context, userID string) (string, error) {
	var acc models.Account
	err := p.app.DB.FindOne(ctx, "accounts", map[string]any{"userid": userID}, &acc)
	if err == nil {
		return acc.ID, nil
	}
	if userID != "merchant" && userID != "external" {
		if !p.userExists(ctx, userID) {
			return "", errors.New("user_not_found")
		}
	}
	newAcc := models.Account{ID: utils.GetUUID(), UserID: userID, Currency: "INR", Status: "active", CachedBalance: 0, Version: 1, CreatedAt: time.Now(), UpdatedAt: time.Now()}
	if err := p.app.DB.InsertOne(ctx, "accounts", newAcc); err != nil {
		err = p.app.DB.FindOne(ctx, "accounts", map[string]any{"userid": userID}, &acc)
		return acc.ID, err
	}
	return newAcc.ID, nil
}

func (p *PaymentUseCase) userExists(ctx context.Context, userID string) bool {
	if userID == "" {
		return false
	}
	var user models.User
	return p.app.DB.FindOne(ctx, "users", map[string]any{"userid": userID}, &user) == nil
}

func (p *PaymentUseCase) getAccountByID(ctx context.Context, accountID string) (models.Account, error) {
	var acc models.Account
	err := p.app.DB.FindOne(ctx, "accounts", map[string]any{"_id": accountID}, &acc)
	return acc, err
}

func (p *PaymentUseCase) ensureAccountActive(acc models.Account) error {
	if acc.Status != "active" {
		return errors.New("account_not_active")
	}
	return nil
}

func (p *PaymentUseCase) failTxn(ctx context.Context, txnID string) {
	_ = p.app.DB.UpdateOne(ctx, "transactions", map[string]any{"_id": txnID}, map[string]any{"$set": map[string]any{"status": "failed", "updated_at": time.Now()}})
}

func (p *PaymentUseCase) successTxn(ctx context.Context, txnID string) {
	_ = p.app.DB.UpdateOne(ctx, "transactions", map[string]any{"_id": txnID}, map[string]any{"$set": map[string]any{"status": "success", "updated_at": time.Now()}})
}

func (p *PaymentUseCase) recordGlobalLedger(ctx context.Context, txnID string, journalEntryID string, ledgerType string, reason string, amount int64, accountID string, userID string) error {
	var entries []models.GlobalLedger
	totalAdditions := int64(0)
	totalDeletions := int64(0)
	err := p.app.DB.FindMany(ctx, "global_ledger", map[string]any{}, &entries)
	if err == nil && len(entries) > 0 {
		lastEntry := entries[len(entries)-1]
		totalAdditions = lastEntry.TotalAdditionsUpto
		totalDeletions = lastEntry.TotalDeletionsUpto
	}
	switch ledgerType {
	case "addition":
		totalAdditions += amount
	case "deletion":
		totalDeletions += amount
	}
	entry := models.GlobalLedger{ID: utils.GetUUID(), TxnID: txnID, Type: ledgerType, Reason: reason, Amount: amount, Currency: "INR", AccountID: accountID, UserID: userID, JournalEntryID: journalEntryID, TotalAdditionsUpto: totalAdditions, TotalDeletionsUpto: totalDeletions, NetBalanceUpto: totalAdditions - totalDeletions, CreatedAt: time.Now()}
	return p.app.DB.InsertOne(ctx, "global_ledger", entry)
}

type PaymentRule struct {
	AllowedEntities map[string]bool
	AllowedMethods  map[string]bool
	AllowCustomAmt  bool
}

var PaymentRules = map[string]PaymentRule{
	"funding":  {AllowedEntities: map[string]bool{"artist": true}, AllowedMethods: map[string]bool{"card": true, "wallet": true}, AllowCustomAmt: true},
	"donation": {AllowedEntities: map[string]bool{"post": true, "artist": true}, AllowedMethods: map[string]bool{"wallet": true, "card": true}, AllowCustomAmt: true},
	"purchase": {AllowedEntities: map[string]bool{"order": true, "cart": true, "ticket": true, "menu": true, "service": true, "product": true, "booking": true, "merch": true, "crop": true, "farm": true, "beat": true}, AllowedMethods: map[string]bool{"wallet": true, "card": true, "transfer": true, "cod": true}, AllowCustomAmt: false},
}

func (p *PaymentUseCase) CashOnDelivery(w http.ResponseWriter, r *http.Request) {
	utils.RespondWithError(w, http.StatusNotImplemented, "cash on delivery is not implemented")
}

func (p *PaymentUseCase) TopUp(w http.ResponseWriter, r *http.Request) {
	utils.RespondWithError(w, http.StatusNotImplemented, "top-up is not implemented")
}

func (p *PaymentUseCase) HandlePaymentWebhook(w http.ResponseWriter, r *http.Request) {
	utils.RespondWithError(w, http.StatusNotImplemented, "payment webhook handling is not implemented")
}

func (p *PaymentUseCase) ListTransactions(w http.ResponseWriter, r *http.Request) {
	utils.RespondWithError(w, http.StatusNotImplemented, "listing transactions is not implemented")
}

func (p *PaymentUseCase) GetBalance(w http.ResponseWriter, r *http.Request) {
	utils.RespondWithError(w, http.StatusNotImplemented, "getting balance is not implemented")
}

func (p *PaymentUseCase) Pay(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := utils.GetUserIDFromRequest(r)
	var req models.PayRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		auditlog.LogAction(ctx, p.app, r, userID, models.AuditActionPayment, "payment_error", "json_decode", "failed", map[string]interface{}{"error": err.Error(), "content_type": r.Header.Get("Content-Type")})
		utils.RespondWithError(w, http.StatusBadRequest, "invalid request: "+err.Error())
		return
	}
	if req.Method == "" {
		req.Method = "wallet"
	}
	validated, err := domain.ValidatePaymentRequest(domain.PaymentRequest{
		PaymentType: req.PaymentType,
		EntityType:  req.EntityType,
		EntityID:    req.EntityID,
		Method:      req.Method,
		Amount:      req.Amount,
	})
	if err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, err.Error())
		return
	}
	req.PaymentType = validated.PaymentType
	req.EntityType = validated.EntityType
	req.EntityID = validated.EntityID
	req.Method = validated.Method
	req.Amount = validated.Amount
	if req.Method == "cod" {
		p.CashOnDelivery(w, r)
		return
	}
	rule, ok := PaymentRules[req.PaymentType]
	if !ok {
		utils.RespondWithError(w, http.StatusBadRequest, "invalid payment type")
		return
	}
	if !rule.AllowedEntities[req.EntityType] {
		utils.RespondWithError(w, http.StatusBadRequest, "entity not allowed for payment type")
		return
	}
	if !rule.AllowedMethods[req.Method] {
		utils.RespondWithError(w, http.StatusBadRequest, "payment method not allowed")
		return
	}
	resolver, err := p.resolver(req.EntityType)
	if err != nil {
		auditlog.LogAction(ctx, p.app, r, userID, models.AuditActionPayment, "payment_error", "resolver_failed", "failed", map[string]interface{}{"entity_type": req.EntityType, "error": err.Error()})
		utils.RespondWithError(w, http.StatusBadRequest, "unsupported entity")
		return
	}
	price, err := resolver(ctx, req.EntityID)
	if err != nil {
		auditlog.LogAction(ctx, p.app, r, userID, models.AuditActionPayment, "payment_error", "entity_not_found", "failed", map[string]interface{}{"entity_type": req.EntityType, "entity_id": req.EntityID, "error": err.Error()})
		utils.RespondWithError(w, http.StatusNotFound, "entity not found: "+req.EntityType+" ("+req.EntityID+")")
		return
	}
	if req.Amount > 0 {
		if !rule.AllowCustomAmt {
			utils.RespondWithError(w, http.StatusBadRequest, "custom amount not allowed")
			return
		}
		if req.PaymentType != "funding" && req.PaymentType != "donation" {
			utils.RespondWithError(w, http.StatusBadRequest, "custom amounts only allowed for donations")
			return
		}
		const maxCustomAmount = 1000000
		if req.Amount > maxCustomAmount {
			utils.RespondWithError(w, http.StatusBadRequest, "custom amount exceeds maximum limit")
			return
		}
		price = req.Amount
	}
	if price <= 0 {
		utils.RespondWithError(w, http.StatusBadRequest, "invalid amount")
		return
	}
	lockKey := "payment_lock:" + userID
	lockToken := utils.GetUUID()
	locked, err := p.app.Cache.SetNX(ctx, lockKey, []byte(lockToken), 30*time.Second)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "lock error")
		return
	}
	if !locked {
		utils.RespondWithError(w, http.StatusTooManyRequests, "retry")
		return
	}
	defer func() { _ = p.app.Cache.Del(ctx, lockKey) }()
	userAcc, err := p.getOrCreateAccount(ctx, userID)
	if err != nil {
		if err.Error() == "user_not_found" {
			utils.RespondWithError(w, http.StatusInternalServerError, "user account not found")
			return
		}
		utils.RespondWithError(w, http.StatusInternalServerError, "account error")
		return
	}

	userAccount, err := p.getAccountByID(ctx, userAcc)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "account error")
		return
	}
	if err := p.ensureAccountActive(userAccount); err != nil {
		utils.RespondWithError(w, http.StatusForbidden, "user account is not active")
		return
	}
	if req.PaymentType == "funding" && userID == req.EntityID {
		utils.RespondWithError(w, http.StatusForbidden, "self funding not allowed")
		return
	}

	var destinationAcc string
	if req.PaymentType == "funding" {
		destinationAcc, err = p.getOrCreateAccount(ctx, req.EntityID)
		if err != nil {
			if err.Error() == "user_not_found" {
				utils.RespondWithError(w, http.StatusBadRequest, "destination user not found")
				return
			}
			utils.RespondWithError(w, http.StatusInternalServerError, "destination account error")
			return
		}
	} else {
		destinationAcc, err = p.getOrCreateAccount(ctx, "merchant")
		if err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "destination account error")
			return
		}
	}

	destinationAccount, err := p.getAccountByID(ctx, destinationAcc)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "destination account error")
		return
	}
	if err := p.ensureAccountActive(destinationAccount); err != nil {
		utils.RespondWithError(w, http.StatusForbidden, "destination account is not active")
		return
	}
	if req.Method == "wallet" {
		var acc models.Account
		if err := p.app.DB.FindOne(ctx, "accounts", map[string]any{"_id": userAcc}, &acc); err != nil {
			utils.RespondWithError(w, http.StatusInternalServerError, "account error")
			return
		}
		if acc.CachedBalance < price {
			utils.RespondWithJSON(w, http.StatusOK, map[string]interface{}{"success": false, "message": "insufficient balance"})
			return
		}
	}
	txnID := utils.GetUUID()
	now := time.Now()
	txn := models.Transaction{ID: txnID, UserID: userID, Type: "payment", Method: req.Method, EntityType: req.EntityType, EntityID: req.EntityID, FromAccount: userAcc, ToAccount: destinationAcc, Amount: price, Currency: "INR", Status: "initiated", CreatedAt: now, UpdatedAt: now, Meta: models.Meta{"payment_type": req.PaymentType}}
	if err := p.app.DB.InsertOne(ctx, "transactions", txn); err != nil {
		http.Error(w, "failed", http.StatusInternalServerError)
		return
	}
	j := models.JournalEntry{ID: utils.GetUUID(), TxnID: txnID, DebitAccount: userAcc, CreditAccount: destinationAcc, Amount: price, Currency: "INR", CreatedAt: now}
	if err := p.app.DB.InsertOne(ctx, "journal", j); err != nil {
		p.failTxn(ctx, txnID)
		utils.RespondWithError(w, http.StatusInternalServerError, "failed")
		return
	}
	if req.Method == "wallet" {
		if err := p.app.DB.Inc(ctx, "accounts", map[string]any{"_id": userAcc}, "cached_balance", -price); err != nil {
			p.failTxn(ctx, txnID)
			utils.RespondWithError(w, http.StatusInternalServerError, "failed")
			return
		}
		if err := p.app.DB.Inc(ctx, "accounts", map[string]any{"_id": destinationAcc}, "cached_balance", price); err != nil {
			p.failTxn(ctx, txnID)
			utils.RespondWithError(w, http.StatusInternalServerError, "failed")
			return
		}
	}
	p.successTxn(ctx, txnID)
	auditlog.LogAction(ctx, p.app, r, userID, models.AuditActionPayment, "transaction", txnID, "success", map[string]interface{}{"amount": price, "method": req.Method, "entity_type": req.EntityType, "entity_id": req.EntityID, "payment_type": req.PaymentType})
	if err := mq.PublishWithMeta(ctx, p.app.MQ, mqevent.PaymentDoneEvent, mqevent.PaymentDonePayload{}); err != nil {
		log.Printf("failed to publish payment event: %v", err)
	}
	utils.RespondWithJSON(w, http.StatusOK, map[string]interface{}{"success": true, "transaction_id": txnID})
}

// Refund transaction
func (p *PaymentUseCase) Refund(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := utils.GetUserIDFromRequest(r)
	var req struct {
		TransactionID string `json:"transactionid"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.TransactionID == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "invalid request")
		return
	}
	var orig models.Transaction
	if err := p.app.DB.FindOne(ctx, "transactions", map[string]any{"_id": req.TransactionID}, &orig); err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "not found")
		return
	}
	if orig.UserID == "" || orig.UserID != userID {
		utils.RespondWithError(w, http.StatusForbidden, "unauthorized")
		return
	}
	if orig.Type != "payment" {
		utils.RespondWithError(w, http.StatusBadRequest, "only payment transactions are refundable")
		return
	}
	if orig.Status != "success" {
		utils.RespondWithError(w, http.StatusBadRequest, "not refundable")
		return
	}
	fromAcc := orig.ToAccount
	toAcc := orig.FromAccount
	lockA := fromAcc
	lockB := toAcc
	if lockB < lockA {
		lockA, lockB = lockB, lockA
	}
	lockKeyA := "refund_lock:" + lockA
	lockTokenA := utils.GetUUID()
	locked, err := p.app.Cache.SetNX(ctx, lockKeyA, []byte(lockTokenA), 30*time.Second)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "lock error")
		return
	}
	if !locked {
		utils.RespondWithError(w, http.StatusTooManyRequests, "retry")
		return
	}
	defer func() { _ = p.app.Cache.Del(ctx, lockKeyA) }()
	lockKeyB := "refund_lock:" + lockB
	lockTokenB := utils.GetUUID()
	locked, err = p.app.Cache.SetNX(ctx, lockKeyB, []byte(lockTokenB), 30*time.Second)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "lock error")
		return
	}
	if !locked {
		utils.RespondWithError(w, http.StatusTooManyRequests, "retry")
		return
	}
	defer func() { _ = p.app.Cache.Del(ctx, lockKeyB) }()
	txnID := utils.GetUUID()
	now := time.Now()
	refundTxn := models.Transaction{ID: txnID, UserID: orig.UserID, Type: "refund", Method: "wallet", FromAccount: fromAcc, ToAccount: toAcc, Amount: orig.Amount, Currency: orig.Currency, Status: "initiated", CreatedAt: now, UpdatedAt: now, Meta: models.Meta{"original_txn": orig.ID}}
	if err := p.app.DB.InsertOne(ctx, "transactions", refundTxn); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "failed")
		return
	}
	j := models.JournalEntry{ID: utils.GetUUID(), TxnID: txnID, DebitAccount: fromAcc, CreditAccount: toAcc, Amount: refundTxn.Amount, Currency: refundTxn.Currency, CreatedAt: now}
	if err := p.app.DB.InsertOne(ctx, "journal", j); err != nil {
		p.failTxn(ctx, txnID)
		http.Error(w, "failed", http.StatusInternalServerError)
		return
	}
	if err := p.app.DB.Inc(ctx, "accounts", map[string]any{"_id": fromAcc}, "cached_balance", -refundTxn.Amount); err != nil {
		p.failTxn(ctx, txnID)
		utils.RespondWithError(w, http.StatusInternalServerError, "failed")
		return
	}
	if err := p.app.DB.Inc(ctx, "accounts", map[string]any{"_id": toAcc}, "cached_balance", refundTxn.Amount); err != nil {
		p.failTxn(ctx, txnID)
		utils.RespondWithError(w, http.StatusInternalServerError, "failed")
		return
	}
	p.successTxn(ctx, txnID)
	_ = p.app.DB.UpdateOne(ctx, "transactions", map[string]any{"_id": orig.ID}, map[string]any{"$set": map[string]any{"status": "reversed", "updated_at": now}})
	if err := mq.PublishWithMeta(ctx, p.app.MQ, mqevent.RefundCompleted, mqevent.RefundCompletedPayload{}); err != nil {
		log.Printf("failed to publish refund completed event: %v", err)
	}
	utils.RespondWithJSON(w, http.StatusOK, map[string]interface{}{"success": true, "transaction_id": txnID})
}

// Transfer
func (p *PaymentUseCase) Transfer(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	senderID := utils.GetUserIDFromRequest(r)
	var req struct {
		Recipient string `json:"recipient"`
		Amount    int64  `json:"amount"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Amount <= 0 || req.Recipient == "" {
		utils.RespondWithError(w, http.StatusBadRequest, "invalid request")
		return
	}
	if senderID == req.Recipient {
		utils.RespondWithError(w, http.StatusBadRequest, "cannot transfer to yourself")
		return
	}
	senderAcc, err := p.getOrCreateAccount(ctx, senderID)
	if err != nil {
		if err.Error() == "user_not_found" {
			utils.RespondWithError(w, http.StatusBadRequest, "sender not found")
			return
		}
		utils.RespondWithError(w, http.StatusInternalServerError, "account error")
		return
	}

	recipientAcc, err := p.getOrCreateAccount(ctx, req.Recipient)
	if err != nil {
		if err.Error() == "user_not_found" {
			utils.RespondWithError(w, http.StatusBadRequest, "recipient not found")
			return
		}
		utils.RespondWithError(w, http.StatusInternalServerError, "recipient error")
		return
	}

	recipientAccount, err := p.getAccountByID(ctx, recipientAcc)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "recipient account error")
		return
	}
	if err := p.ensureAccountActive(recipientAccount); err != nil {
		utils.RespondWithError(w, http.StatusForbidden, "recipient account is not active")
		return
	}
	lockA := senderAcc
	lockB := recipientAcc
	if lockB < lockA {
		lockA, lockB = lockB, lockA
	}
	lockKeyA := "transfer_lock:" + lockA
	lockKeyB := "transfer_lock:" + lockB
	tokenA := utils.GetUUID()
	tokenB := utils.GetUUID()
	locked, err := p.app.Cache.SetNX(ctx, lockKeyA, []byte(tokenA), 30*time.Second)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "lock error")
		return
	}
	if !locked {
		utils.RespondWithError(w, http.StatusTooManyRequests, "retry")
		return
	}
	defer func() { _ = p.app.Cache.Del(ctx, lockKeyA) }()
	locked, err = p.app.Cache.SetNX(ctx, lockKeyB, []byte(tokenB), 30*time.Second)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "lock error")
		return
	}
	if !locked {
		utils.RespondWithError(w, http.StatusTooManyRequests, "retry")
		return
	}
	defer func() { _ = p.app.Cache.Del(ctx, lockKeyB) }()
	var sender models.Account
	if err := p.app.DB.FindOne(ctx, "accounts", map[string]any{"_id": senderAcc}, &sender); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "account error")
		return
	}
	if sender.CachedBalance < req.Amount {
		utils.RespondWithJSON(w, http.StatusOK, map[string]interface{}{"success": false, "message": "insufficient balance"})
		return
	}
	txnID := utils.GetUUID()
	now := time.Now()
	master := models.Transaction{ID: txnID, Type: "transfer", Method: "wallet", FromAccount: senderAcc, ToAccount: recipientAcc, Amount: req.Amount, Currency: "INR", Status: "initiated", CreatedAt: now, UpdatedAt: now, Meta: models.Meta{"note": "user transfer"}}
	if err := p.app.DB.InsertOne(ctx, "transactions", master); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "failed")
		return
	}
	j := models.JournalEntry{ID: utils.GetUUID(), TxnID: txnID, DebitAccount: senderAcc, CreditAccount: recipientAcc, Amount: req.Amount, Currency: "INR", CreatedAt: now}
	if err := p.app.DB.InsertOne(ctx, "journal", j); err != nil {
		p.failTxn(ctx, txnID)
		utils.RespondWithError(w, http.StatusInternalServerError, "failed")
		return
	}
	if err := p.app.DB.Inc(ctx, "accounts", map[string]any{"_id": senderAcc}, "cached_balance", -req.Amount); err != nil {
		p.failTxn(ctx, txnID)
		utils.RespondWithError(w, http.StatusInternalServerError, "failed")
		return
	}
	if err := p.app.DB.Inc(ctx, "accounts", map[string]any{"_id": recipientAcc}, "cached_balance", req.Amount); err != nil {
		p.failTxn(ctx, txnID)
		utils.RespondWithError(w, http.StatusInternalServerError, "failed")
		return
	}
	_ = p.app.DB.InsertMany(ctx, "transactions", []interface{}{models.Transaction{ID: utils.GetUUID(), ParentTxn: txnID, UserID: senderID, Type: "debit", Amount: req.Amount, Status: "success", CreatedAt: now}, models.Transaction{ID: utils.GetUUID(), ParentTxn: txnID, UserID: req.Recipient, Type: "credit", Amount: req.Amount, Status: "success", CreatedAt: now}})
	p.successTxn(ctx, txnID)
	if err := mq.PublishWithMeta(ctx, p.app.MQ, mqevent.MoneyTransferredEvent, mqevent.MoneyTransferredPayload{}); err != nil {
		log.Printf("failed to publish money transferred event: %v", err)
	}
	utils.RespondWithJSON(w, http.StatusOK, map[string]interface{}{"success": true, "transaction_id": txnID})
}

// Create wallet
func (p *PaymentUseCase) CreateWallet(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := utils.GetUserIDFromRequest(r)
	var existing models.Account
	err := p.app.DB.FindOne(ctx, "accounts", map[string]any{"userid": userID}, &existing)
	if err == nil {
		utils.RespondWithError(w, http.StatusConflict, "wallet already exists")
		return
	}
	if !p.userExists(ctx, userID) {
		utils.RespondWithError(w, http.StatusBadRequest, "user does not exist")
		return
	}
	newAcc := models.Account{ID: utils.GetUUID(), UserID: userID, Currency: "INR", Status: "active", CachedBalance: 0, Version: 1, CreatedAt: time.Now(), UpdatedAt: time.Now()}
	if err := p.app.DB.InsertOne(ctx, "accounts", newAcc); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "failed to create wallet")
		return
	}
	utils.RespondWithJSON(w, http.StatusCreated, map[string]any{"success": true, "account_id": newAcc.ID})
}

// GetAccountStrict retrieves an account or returns an error if not found
func (p *PaymentUseCase) GetAccountStrict(ctx context.Context, userID string) (string, error) {
	var acc models.Account
	err := p.app.DB.FindOne(ctx, "accounts", map[string]any{"userid": userID}, &acc)
	if err != nil {
		return "", errors.New("account_not_found")
	}
	return acc.ID, nil
}

func isAdmin(_ context.Context) bool { return false }
