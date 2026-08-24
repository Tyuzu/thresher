import { createElement } from "../../../components/createElement.js";
import { apiFetch } from "../../../api/api.js";

/**
 * Renders an isolated refund request form node.
 * @param {Object} order - The normalized target order payload.
 * @param {Function} onClose - Dismiss callback function.
 * @param {Function} onSubmit - Form submission processing handler callback.
 */
export function renderRefundRequestForm(order, onClose, onSubmit) {
  if (!order) return createElement("div", {}, ["Missing order details."]);

  const textareaEl = createElement("textarea", {
    class: "form-input",
    placeholder: "Please explain why you want to refund this order...",
    rows: "4",
    minlength: "10",
    maxlength: "500",
  });

  const submitBtn = createElement("button", {
    class: "btn btn-primary",
    type: "button",
    events: {
      click: async () => {
        const reason = textareaEl.value.trim();
        if (!reason || reason.length < 10) {
          alert("Please provide at least 10 characters explaining the reason");
          return;
        }

        submitBtn.disabled = true;
        const oldText = submitBtn.textContent;
        submitBtn.textContent = "Submitting...";

        try {
          await onSubmit(reason);
        } catch (err) {
          submitBtn.disabled = false;
          submitBtn.textContent = oldText;
        }
      },
    },
  }, ["Submit Refund Request"]);

  return createElement("div", { class: "refund-request-form" }, [
    createElement("div", { class: "form-header" }, [
      createElement("h3", {}, ["Request Refund"]),
      createElement("button", {
        class: "close-btn",
        type: "button",
        events: { click: onClose },
      }, ["✕"]),
    ]),

    createElement("div", { class: "form-content" }, [
      createElement("div", { class: "form-group" }, [
        createElement("label", {}, ["Order ID"]),
        createElement("p", { class: "order-id-display" }, [String(order.orderId || "N/A")]),
      ]),

      createElement("div", { class: "form-group" }, [
        createElement("label", {}, ["Amount to Refund"]),
        createElement("p", { class: "amount-display" }, [
          `₹${((order.total || 0) / 100).toFixed(2)}`,
        ]),
      ]),

      createElement("div", { class: "form-group" }, [
        createElement("label", {}, ["Reason for Refund"]),
        textareaEl,
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
        events: { click: onClose },
      }, ["Cancel"]),
      submitBtn,
    ]),
  ]);
}

// Submit refund request
export async function submitRefundRequest(orderId, reason) {
  try {
    return await apiFetch("/refunds/request", "POST", {
      order_id: orderId,
      reason: reason,
    });
  } catch (err) {
    console.error("Failed to submit refund request:", err);
    throw err;
  }
}

// Get user's refund requests
export async function fetchMyRefunds(skip = 0, limit = 10) {
  try {
    return await apiFetch(`/refunds/my-requests?skip=${Number(skip)}&limit=${Number(limit)}`, "GET");
  } catch (err) {
    console.error("Failed to fetch refund requests:", err);
    throw err;
  }
}

// Render refund status badge
export function renderRefundStatus(order) {
  if (!order || !order.refundStatus || order.refundStatus === "none") {
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
    String(statusText),
  ]);
}

// Check if order can be refunded
export function canRefundOrder(order) {
  if (!order) return false;

  const isCompleted = order.status === "completed" || order.status === "delivered";
  
  const hasNoPriorRefundRequests = !order.refundStatus || order.refundStatus === "none";
  
  const withinWindow = order.createdAt 
    ? (Date.now() - new Date(order.createdAt).getTime()) < 30 * 24 * 60 * 60 * 1000 
    : true;

  return isCompleted && hasNoPriorRefundRequests && withinWindow;
}