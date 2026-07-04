import { createElement } from "../../../components/createElement.js";
import { apiFetch } from "../../../api/api.js";

/**
 * Render refund requests section for admin dashboard
 */
export function renderRefundRequests(refunds) {
  return createElement("div", { class: "refund-requests-section" }, [
    createElement("h2", {}, ["Refund Requests"]),
    
    refunds.length === 0
      ? createElement("p", { class: "empty-message" }, ["No refund requests"])
      : createElement("div", { class: "refund-list" }, [
          ...refunds.map(refund => renderRefundCard(refund)),
        ]),
  ]);
}

/**
 * Render a single refund request card
 */
function renderRefundCard(refund) {
  const statusClass = `status-${refund.status}`;
  const createdDate = new Date(refund.created_at || refund.createdAt);
  const formattedDate = createdDate.toLocaleDateString() + " " + createdDate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

  return createElement("div", { class: `refund-card ${statusClass}` }, [
    createElement("div", { class: "refund-header" }, [
      createElement("div", { class: "header-left" }, [
        createElement("h3", {}, [
          `Refund: ${refund.order_id}`,
        ]),
        createElement("p", { class: "refund-user" }, [
          `User ID: ${refund.user_id}`,
        ]),
      ]),
      createElement("div", { class: "header-right" }, [
        createElement("span", { class: `status-badge ${statusClass}` }, [
          refund.status.charAt(0).toUpperCase() + refund.status.slice(1),
        ]),
        createElement("span", { class: "amount" }, [
          `₹${(refund.amount / 100).toFixed(2)}`,
        ]),
      ]),
    ]),

    createElement("div", { class: "refund-body" }, [
      createElement("div", { class: "refund-info" }, [
        createElement("p", {}, [
          createElement("strong", {}, ["Reason: "]),
          refund.reason,
        ]),
        createElement("p", { class: "date" }, [
          `Requested: ${formattedDate}`,
        ]),
        refund.order_type && createElement("p", {}, [
          createElement("strong", {}, ["Order Type: "]),
          refund.order_type === "farm" ? "Farm Order" : "Regular Order",
        ]),
      ]),

      refund.status === "pending" && createElement("div", { class: "refund-actions" }, [
        createElement("button", {
          class: "btn btn-success btn-sm",
          onclick: () => handleApproveRefund(refund.id),
        }, ["Approve"]),
        createElement("button", {
          class: "btn btn-danger btn-sm",
          onclick: () => handleRejectRefund(refund.id),
        }, ["Reject"]),
      ]),

      (refund.status === "approved" || refund.status === "rejected") && refund.review_notes && createElement("div", { class: "review-section" }, [
        createElement("p", {}, [
          createElement("strong", {}, ["Admin Notes: "]),
          refund.review_notes,
        ]),
        refund.reviewed_by && createElement("p", { class: "reviewer" }, [
          `Reviewed by: ${refund.reviewed_by}`,
        ]),
      ]),
    ]),
  ]);
}

/**
 * Render refund section in order details
 */
export function renderOrderRefundSection(order, onRefundClick) {
  const canRefund = shouldShowRefundOption(order);
  
  return createElement("div", { class: "order-refund-section" }, [
    createElement("h4", {}, ["Refund Information"]),
    
    order.refundStatus && createElement("div", { class: "refund-status-display" }, [
      createElement("p", {}, [
        createElement("strong", {}, ["Status: "]),
        createElement("span", { class: `status-${order.refundStatus}` }, [
          getRefundStatusLabel(order.refundStatus),
        ]),
      ]),
    ]),

    !order.refundStatus && canRefund && createElement("button", {
      class: "btn btn-warning btn-sm",
      onclick: onRefundClick,
    }, ["Request Refund"]),

    !canRefund && !order.refundStatus && createElement("p", { class: "refund-not-available" }, [
      "This order cannot be refunded at this time.",
    ]),
  ]);
}

/**
 * Handle approve refund (admin)
 */
async function handleApproveRefund(refundId) {
  const notes = prompt("Enter approval notes (optional):");
  if (notes === null) return;

  try {
    const res = await apiFetch(`/refunds/${refundId}/approve`, "POST", {
      notes: notes || "",
    });
    alert("Refund approved successfully");
    location.reload(); // Reload to see updated status
  } catch (err) {
    console.error("Failed to approve refund:", err);
    alert("Failed to approve refund: " + (err.message || "Unknown error"));
  }
}

/**
 * Handle reject refund (admin)
 */
async function handleRejectRefund(refundId) {
  const notes = prompt("Enter rejection reason (required):");
  if (!notes || notes.trim() === "") {
    alert("Rejection reason is required");
    return;
  }

  try {
    const res = await apiFetch(`/refunds/${refundId}/reject`, "POST", {
      notes: notes.trim(),
    });
    alert("Refund rejected successfully");
    location.reload(); // Reload to see updated status
  } catch (err) {
    console.error("Failed to reject refund:", err);
    alert("Failed to reject refund: " + (err.message || "Unknown error"));
  }
}

/**
 * Check if refund option should be shown
 */
function shouldShowRefundOption(order) {
  const isCompleted = ["completed", "delivered"].includes((order.status || "").toLowerCase());
  const noActiveRefund = !order.refundStatus || ["rejected", "completed"].includes(order.refundStatus);
  
  return isCompleted && noActiveRefund;
}

/**
 * Get readable refund status label
 */
function getRefundStatusLabel(status) {
  const labels = {
    pending: "Refund Pending Review",
    approved: "Refund Approved",
    rejected: "Refund Rejected",
    completed: "Refunded",
  };
  return labels[status] || status;
}

/**
 * Fetch admin refund requests
 */
export async function fetchAdminRefunds(status = "", orderType = "", skip = 0, limit = 20) {
  try {
    let url = `/refunds/all?skip=${skip}&limit=${limit}`;
    if (status) url += `&status=${status}`;
    if (orderType) url += `&order_type=${orderType}`;
    
    const res = await apiFetch(url, "GET");
    return res;
  } catch (err) {
    console.error("Failed to fetch refunds:", err);
    throw err;
  }
}
