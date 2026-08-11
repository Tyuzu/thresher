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
	RefundID   string    `json:"refundid"`
	OrderID    string    `json:"orderid"`
	UserID     string    `json:"userid"`
	Reason     string    `json:"reason"`
	OccurredAt time.Time `json:"occurred_at"`
}

type RefundAcceptedPayload struct {
	RefundID   string    `json:"refundid"`
	OrderID    string    `json:"orderid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type RefundRejectedPayload struct {
	RefundID   string    `json:"refundid"`
	OrderID    string    `json:"orderid"`
	Reason     string    `json:"reason"`
	OccurredAt time.Time `json:"occurred_at"`
}

type RefundForcedPayload struct {
	RefundID   string    `json:"refundid"`
	OrderID    string    `json:"orderid"`
	AdminID    string    `json:"adminid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type RefundCompletedPayload struct {
	RefundID    string    `json:"refundid"`
	OrderID     string    `json:"orderid"`
	CompletedAt time.Time `json:"completed_at"`
}

type CashOnDeliveryProcessedPayload struct {
	RefundID    string    `json:"refundid"`
	OrderID     string    `json:"orderid"`
	CompletedAt time.Time `json:"completed_at"`
}

type PaymentDonePayload struct {
	RefundID    string    `json:"refundid"`
	OrderID     string    `json:"orderid"`
	CompletedAt time.Time `json:"completed_at"`
}

type TopupDonePayload struct {
	RefundID    string    `json:"refundid"`
	OrderID     string    `json:"orderid"`
	CompletedAt time.Time `json:"completed_at"`
}

type MoneyTransferredPayload struct {
	RefundID    string    `json:"refundid"`
	OrderID     string    `json:"orderid"`
	CompletedAt time.Time `json:"completed_at"`
}

type PaymentProcessedPayload struct {
	RefundID    string    `json:"refundid"`
	OrderID     string    `json:"orderid"`
	CompletedAt time.Time `json:"completed_at"`
}
