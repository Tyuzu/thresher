import { createElement } from "../../../components/createElement.js";
import { apiFetch } from "../../../api/api.js";

// Show refund request form
export function renderRefundRequestForm(order, onClose, onSubmit) {
  const form = createElement("div", { class: "refund-request-form" }, [
    createElement("div", { class: "form-header" }, [
      createElement("h3", {}, ["Request Refund"]),
      createElement("button", {
        class: "close-btn",
        type: "button",
        onclick: onClose,
      }, ["✕"]),
    ]),

    createElement("div", { class: "form-content" }, [
      createElement("div", { class: "form-group" }, [
        createElement("label", {}, ["Order ID"]),
        createElement("p", { class: "order-id-display" }, [order.orderId]),
      ]),

      createElement("div", { class: "form-group" }, [
        createElement("label", {}, ["Amount to Refund"]),
        createElement("p", { class: "amount-display" }, [
          `₹${(order.total / 100).toFixed(2)}`,
        ]),
      ]),

      createElement("div", { class: "form-group" }, [
        createElement("label", { for: "refund-reason" }, ["Reason for Refund"]),
        createElement("textarea", {
          id: "refund-reason",
          class: "form-input",
          placeholder: "Please explain why you want to refund this order...",
          rows: "4",
          minlength: "10",
          maxlength: "500",
        }, []),
      ]),

      createElement("div", { class: "form-info" }, [
        createElement("p", {}, [
          "Your refund request will be reviewed by our team. You'll receive a notification once it's processed.",
        ]),
      ]),
    ]),

    createElement("div", { class: "form-actions" }, [
      createElement("button", {
        class: "btn btn-secondary",
        type: "button",
        onclick: onClose,
      }, ["Cancel"]),
      createElement("button", {
        class: "btn btn-primary",
        type: "button",
        onclick: () => {
          const reason = document.getElementById("refund-reason").value.trim();
          if (!reason || reason.length < 10) {
            alert("Please provide at least 10 characters explaining the reason");
            return;
          }
          onSubmit(reason);
        },
      }, ["Submit Refund Request"]),
    ]),
  ]);

  return form;
}

// Submit refund request
export async function submitRefundRequest(orderId, reason) {
  try {
    const res = await apiFetch("/refunds/request", "POST", {
      order_id: orderId,
      reason: reason,
    });
    return res;
  } catch (err) {
    console.error("Failed to submit refund request:", err);
    throw err;
  }
}

// Get user's refund requests
export async function fetchMyRefunds(skip = 0, limit = 10) {
  try {
    const res = await apiFetch(`/refunds/my-requests?skip=${skip}&limit=${limit}`, "GET");
    return res;
  } catch (err) {
    console.error("Failed to fetch refund requests:", err);
    throw err;
  }
}

// Render refund status badge
export function renderRefundStatus(order) {
  if (!order.refundStatus || order.refundStatus === "none") {
    return null;
  }

  const statusClass = `refund-status-${order.refundStatus}`;
  const statusText = {
    pending: "Refund Pending",
    approved: "Refund Approved",
    rejected: "Refund Rejected",
    completed: "Refunded",
  }[order.refundStatus] || order.refundStatus;

  return createElement("span", { class: `refund-status ${statusClass}` }, [
    statusText,
  ]);
}

// Check if order can be refunded
export function canRefundOrder(order) {
  // Can refund if:
  // - Order is completed/delivered
  // - No active refund request exists
  // - Order is within refund window (e.g., 30 days)
  const isCompleted = order.status === "completed" || order.status === "delivered";
  const noActiveRefund = !order.refundStatus || order.refundStatus === "rejected" || order.refundStatus === "completed";
  
  return isCompleted && noActiveRefund;
}
