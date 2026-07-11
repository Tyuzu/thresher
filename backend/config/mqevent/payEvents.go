package mqevent

import "time"

/* ============================================================
   REFUND EVENTS
============================================================ */

const (
	RefundRequested              = "refund.requested"
	RefundAccepted               = "refund.accepted"
	RefundRejected               = "refund.rejected"
	RefundForced                 = "refund.forced"
	RefundCompleted              = "refund.completed"
	CashOnDeliveryProcessedEvent = "refund.completed"
	PaymentDoneEvent             = "refund.completed"
	TopupDoneEvent               = "refund.completed"
	MoneyTransferredEvent        = "refund.completed"
	PaymentProcessedEvent        = "refund.completed"
)

type RefundRequestedPayload struct {
	RefundID   string    `json:"refund_id"`
	OrderID    string    `json:"order_id"`
	UserID     string    `json:"user_id"`
	Reason     string    `json:"reason"`
	OccurredAt time.Time `json:"occurred_at"`
}

type RefundAcceptedPayload struct {
	RefundID   string    `json:"refund_id"`
	OrderID    string    `json:"order_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

type RefundRejectedPayload struct {
	RefundID   string    `json:"refund_id"`
	OrderID    string    `json:"order_id"`
	Reason     string    `json:"reason"`
	OccurredAt time.Time `json:"occurred_at"`
}

type RefundForcedPayload struct {
	RefundID   string    `json:"refund_id"`
	OrderID    string    `json:"order_id"`
	AdminID    string    `json:"admin_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

type RefundCompletedPayload struct {
	RefundID    string    `json:"refund_id"`
	OrderID     string    `json:"order_id"`
	CompletedAt time.Time `json:"completed_at"`
}

type CashOnDeliveryProcessedPayload struct {
	RefundID    string    `json:"refund_id"`
	OrderID     string    `json:"order_id"`
	CompletedAt time.Time `json:"completed_at"`
}

type PaymentDonePayload struct {
	RefundID    string    `json:"refund_id"`
	OrderID     string    `json:"order_id"`
	CompletedAt time.Time `json:"completed_at"`
}

type TopupDonePayload struct {
	RefundID    string    `json:"refund_id"`
	OrderID     string    `json:"order_id"`
	CompletedAt time.Time `json:"completed_at"`
}

type MoneyTransferredPayload struct {
	RefundID    string    `json:"refund_id"`
	OrderID     string    `json:"order_id"`
	CompletedAt time.Time `json:"completed_at"`
}

type PaymentProcessedPayload struct {
	RefundID    string    `json:"refund_id"`
	OrderID     string    `json:"order_id"`
	CompletedAt time.Time `json:"completed_at"`
}
