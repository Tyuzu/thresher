package models

import "time"

// Meta is a generic key-value map for transaction metadata
// Keep this flexible, but never put money here.
type Meta map[string]interface{}

// =====================
// MONEY & TRANSACTIONS
// =====================

// Transaction represents a wallet or payment transaction.
// Amount is ALWAYS stored in the smallest currency unit (e.g. paise).
type Transaction struct {
	ID        string `bson:"_id,omitempty" json:"id"`
	UserID    string `bson:"userid,omitempty" json:"userid,omitempty"` // owner (viewer) of this txn
	ParentTxn string `bson:"parenttxn,omitempty" json:"parenttxn,omitempty"`

	Type string `bson:"type" json:"type"`
	// allowed:
	// topup, payment, transfer, refund
	// debit, credit (derived / per-user views)

	Method string `bson:"method" json:"method"`
	// wallet, card, upi, cod, transfer, refund

	EntityType string `bson:"entitytype,omitempty" json:"entitytype,omitempty"`
	EntityID   string `bson:"entityid,omitempty" json:"entityid,omitempty"`

	FromAccount string `bson:"fromaccount,omitempty" json:"fromaccount,omitempty"`
	ToAccount   string `bson:"toaccount,omitempty" json:"toaccount,omitempty"`

	Amount   int64  `bson:"amount" json:"amount"` // SMALLEST UNIT (paise)
	Currency string `bson:"currency" json:"currency"`

	Status string `bson:"status" json:"status"`
	// initiated, success, failed, reversed

	IdempotencyKey string `bson:"externalref,omitempty" json:"externalref,omitempty"`

	Meta Meta `bson:"meta,omitempty" json:"meta,omitempty"`

	CreatedAt time.Time `bson:"createdat" json:"createdat"`
	UpdatedAt time.Time `bson:"updatedat" json:"updatedat"`
}

// =====================
// LEDGER (SOURCE OF TRUTH)
// =====================

// JournalEntry represents a double-entry ledger record.
// This is the real source of truth for money movement.
type JournalEntry struct {
	ID            string `bson:"_id,omitempty" json:"id"`
	TxnID         string `bson:"txnid" json:"txnid"`
	DebitAccount  string `bson:"debitaccount" json:"debitaccount"`
	CreditAccount string `bson:"creditaccount" json:"creditaccount"`

	Amount   int64  `bson:"amount" json:"amount"` // SMALLEST UNIT
	Currency string `bson:"currency" json:"currency"`

	CreatedAt time.Time `bson:"createdat" json:"createdat"`
	Meta      Meta      `bson:"meta,omitempty" json:"meta,omitempty"`
}

// GlobalLedger tracks total money additions and deletions across the system.
// This is used for auditing and reporting total money in circulation.
type GlobalLedger struct {
	ID             string `bson:"_id,omitempty" json:"id"`
	TxnID          string `bson:"txnid" json:"txnid"`
	Type           string `bson:"type" json:"type"`     // addition | deletion | transfer
	Reason         string `bson:"reason" json:"reason"` // topup | refund | payment | transfer | correction
	Amount         int64  `bson:"amount" json:"amount"` // SMALLEST UNIT, always positive
	Currency       string `bson:"currency" json:"currency"`
	AccountID      string `bson:"accountid" json:"accountid"`
	UserID         string `bson:"userid,omitempty" json:"userid,omitempty"`
	JournalEntryID string `bson:"journalentryid,omitempty" json:"journalentryid,omitempty"`

	TotalAdditionsUpto int64 `bson:"totaladditionsupto" json:"totaladditionsupto"` // cumulative additions
	TotalDeletionsUpto int64 `bson:"totaldeletionsupto" json:"totaldeletionsupto"` // cumulative deletions
	NetBalanceUpto     int64 `bson:"netbalanceupto" json:"netbalanceupto"`         // additions - deletions

	CreatedAt time.Time `bson:"createdat" json:"createdat"`
	Meta      Meta      `bson:"meta,omitempty" json:"meta,omitempty"`
}

// =====================
// ACCOUNTS
// =====================

// Account represents a wallet account.
// CachedBalance is a PERFORMANCE CACHE, not a source of truth.
type Account struct {
	ID       string `bson:"_id,omitempty" json:"id"`
	UserID   string `bson:"userid" json:"userid"`
	Currency string `bson:"currency" json:"currency"`
	Status   string `bson:"status" json:"status"`
	// active, frozen, closed
	CachedBalance int64     `bson:"cachedbalance" json:"cachedbalance"` // SMALLEST UNIT
	Version       int       `bson:"version" json:"version"`
	CreatedAt     time.Time `bson:"createdat" json:"createdat"`
	UpdatedAt     time.Time `bson:"updatedat" json:"updatedat"`
}

// =====================
// PAYMENTS
// =====================

// PayRequest is the request payload for /wallet/pay
// Amount is optional and ONLY used when entity allows custom pricing.
type PayRequest struct {
	PaymentType string `json:"paymenttype"` // funding | purchase
	EntityType  string `json:"entitytype"`
	EntityID    string `json:"entityid"`
	Method      string `json:"method"`           // wallet, card, upi, cod
	Amount      int64  `json:"amount,omitempty"` // SMALLEST UNIT
}

// =====================
// IDEMPOTENCY
// =====================

// IdempotencyRecord stores cached responses for safe retries.
type IdempotencyRecord struct {
	Key         string `bson:"key" json:"key"`
	Method      string `bson:"method" json:"method"`
	Path        string `bson:"path" json:"path"`
	UserID      string `bson:"userid" json:"userid"`
	RequestHash string `bson:"requesthash" json:"requesthash"`

	Response map[string]interface{} `bson:"response,omitempty" json:"response,omitempty"`

	CreatedAt time.Time `bson:"createdat" json:"createdat"`
	ExpiresAt time.Time `bson:"expiresat" json:"expiresat"`
}
