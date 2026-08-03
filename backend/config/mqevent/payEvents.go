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
	OccurredAt time.Time `json:"occurredat"`
}

type RefundAcceptedPayload struct {
	RefundID   string    `json:"refundid"`
	OrderID    string    `json:"orderid"`
	OccurredAt time.Time `json:"occurredat"`
}

type RefundRejectedPayload struct {
	RefundID   string    `json:"refundid"`
	OrderID    string    `json:"orderid"`
	Reason     string    `json:"reason"`
	OccurredAt time.Time `json:"occurredat"`
}

type RefundForcedPayload struct {
	RefundID   string    `json:"refundid"`
	OrderID    string    `json:"orderid"`
	AdminID    string    `json:"adminid"`
	OccurredAt time.Time `json:"occurredat"`
}

type RefundCompletedPayload struct {
	RefundID    string    `json:"refundid"`
	OrderID     string    `json:"orderid"`
	CompletedAt time.Time `json:"completedat"`
}

type CashOnDeliveryProcessedPayload struct {
	RefundID    string    `json:"refundid"`
	OrderID     string    `json:"orderid"`
	CompletedAt time.Time `json:"completedat"`
}

type PaymentDonePayload struct {
	RefundID    string    `json:"refundid"`
	OrderID     string    `json:"orderid"`
	CompletedAt time.Time `json:"completedat"`
}

type TopupDonePayload struct {
	RefundID    string    `json:"refundid"`
	OrderID     string    `json:"orderid"`
	CompletedAt time.Time `json:"completedat"`
}

type MoneyTransferredPayload struct {
	RefundID    string    `json:"refundid"`
	OrderID     string    `json:"orderid"`
	CompletedAt time.Time `json:"completedat"`
}

type PaymentProcessedPayload struct {
	RefundID    string    `json:"refundid"`
	OrderID     string    `json:"orderid"`
	CompletedAt time.Time `json:"completedat"`
}
