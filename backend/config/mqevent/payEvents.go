package mqevent

import "time"

/* ============================================================
   REFUND EVENTS
============================================================ */

const (
	RefundRequestedEvent = "refund.requested"
	RefundAcceptedEvent  = "refund.accepted"
	RefundRejectedEvent  = "refund.rejected"
	RefundForcedEvent    = "refund.forced"
	RefundCompletedEvent = "refund.completed"
)

/* ============================================================
   PAYMENT EVENTS
============================================================ */

const (
	PaymentDoneEvent      = "payment.completed"
	PaymentProcessedEvent = "payment.processed"
)

/* ============================================================
   CASH ON DELIVERY EVENTS
============================================================ */

const (
	CashOnDeliveryProcessedEvent = "cash_on_delivery.processed"
)

/* ============================================================
   TOPUP EVENTS
============================================================ */

const (
	TopupDoneEvent = "topup.completed"
)

/* ============================================================
   MONEY TRANSFER EVENTS
============================================================ */

const (
	MoneyTransferredEvent = "money_transfer.completed"
)

/* ============================================================
   REFUND REQUESTED
============================================================ */

type RefundRequestedPayload struct {
	RefundID   string    `json:"refund_id"`
	OrderID    string    `json:"order_id"`
	UserID     string    `json:"user_id"`
	Reason     string    `json:"reason"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   REFUND ACCEPTED
============================================================ */

type RefundAcceptedPayload struct {
	RefundID   string    `json:"refund_id"`
	OrderID    string    `json:"order_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   REFUND REJECTED
============================================================ */

type RefundRejectedPayload struct {
	RefundID   string    `json:"refund_id"`
	OrderID    string    `json:"order_id"`
	Reason     string    `json:"reason"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   REFUND FORCED
============================================================ */

type RefundForcedPayload struct {
	RefundID   string    `json:"refund_id"`
	OrderID    string    `json:"order_id"`
	AdminID    string    `json:"admin_id"`
	Reason     string    `json:"reason,omitempty"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   REFUND COMPLETED
============================================================ */

type RefundCompletedPayload struct {
	RefundID    string    `json:"refund_id"`
	OrderID     string    `json:"order_id"`
	CompletedAt time.Time `json:"completed_at"`
	OccurredAt  time.Time `json:"occurred_at"`
}

/* ============================================================
   CASH ON DELIVERY PROCESSED
============================================================ */

type CashOnDeliveryProcessedPayload struct {
	OrderID     string    `json:"order_id"`
	UserID      string    `json:"user_id,omitempty"`
	Amount      int64     `json:"amount"`
	Currency    string    `json:"currency"`
	ProcessedAt time.Time `json:"processed_at"`
	OccurredAt  time.Time `json:"occurred_at"`
}

/* ============================================================
   PAYMENT COMPLETED
============================================================ */

type PaymentDonePayload struct {
	PaymentID   string    `json:"payment_id"`
	OrderID     string    `json:"order_id,omitempty"`
	UserID      string    `json:"user_id,omitempty"`
	Amount      int64     `json:"amount"`
	Currency    string    `json:"currency"`
	CompletedAt time.Time `json:"completed_at"`
	OccurredAt  time.Time `json:"occurred_at"`
}

/* ============================================================
   TOPUP COMPLETED
============================================================ */

type TopupDonePayload struct {
	TopupID     string    `json:"topup_id"`
	UserID      string    `json:"user_id"`
	Amount      int64     `json:"amount"`
	Currency    string    `json:"currency"`
	CompletedAt time.Time `json:"completed_at"`
	OccurredAt  time.Time `json:"occurred_at"`
}

/* ============================================================
   MONEY TRANSFER COMPLETED
============================================================ */

type MoneyTransferredPayload struct {
	TransferID  string    `json:"transfer_id"`
	FromUserID  string    `json:"from_user_id"`
	ToUserID    string    `json:"to_user_id"`
	Amount      int64     `json:"amount"`
	Currency    string    `json:"currency"`
	CompletedAt time.Time `json:"completed_at"`
	OccurredAt  time.Time `json:"occurred_at"`
}

/* ============================================================
   PAYMENT PROCESSED
============================================================ */

type PaymentProcessedPayload struct {
	PaymentID   string    `json:"payment_id"`
	OrderID     string    `json:"order_id,omitempty"`
	UserID      string    `json:"user_id,omitempty"`
	Amount      int64     `json:"amount"`
	Currency    string    `json:"currency"`
	ProcessedAt time.Time `json:"processed_at"`
	OccurredAt  time.Time `json:"occurred_at"`
}
