import { createElement } from "../../../components/createElement.js";
import { apiFetch } from "../../../api/api.js";

/**
 * Render refund requests section for admin dashboard
 * @param {Array} refunds - Collection of active requests
 * @param {Function} onStateMutated - Optional lifecycle callback to trigger soft state updates instead of window reloads
 */
export function renderRefundRequests(refunds, onStateMutated) {
  const safeRefunds = Array.isArray(refunds) ? refunds : [];

  return createElement("div", { class: "refund-requests-section" }, [
    createElement("h2", {}, ["Refund Requests"]),
    
    safeRefunds.length === 0
      ? createElement("p", { class: "empty-message" }, ["No refund requests"])
      : createElement("div", { class: "refund-list" }, 
          // FIXED: Filter out falsy short-circuits ahead of node attachment maps
          safeRefunds.map(refund => renderRefundCard(refund, onStateMutated)).filter(Boolean)
        ),
  ]);
}

/**
 * Render a single refund request card
 */
function renderRefundCard(refund, onStateMutated) {
  if (!refund) return null;

  const currentStatus = String(refund.status || "pending").toLowerCase();
  const statusClass = `status-${currentStatus}`;
  const createdDate = new Date(refund.created_at || refund.createdAt || Date.now());
  
  const formattedDate = Number.isNaN(createdDate.getTime()) 
    ? "N/A" 
    : createdDate.toLocaleDateString() + " " + createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Pre-compile sub-components explicitly to handle structural cleanups clean
  const childrenNodes = [
    createElement("div", { class: "refund-header" }, [
      createElement("div", { class: "header-left" }, [
        createElement("h3", {}, [`Refund: ${refund.order_id || "N/A"}`]),
        createElement("p", { class: "refund-user" }, [`User ID: ${refund.user_id || "N/A"}`]),
      ]),
      createElement("div", { class: "header-right" }, [
        createElement("span", { class: `status-badge ${statusClass}` }, [
          currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1),
        ]),
        createElement("span", { class: "amount" }, [
          `₹${((refund.amount || 0) / 100).toFixed(2)}`,
        ]),
      ]),
    ]),

    createElement("div", { class: "refund-body" }, [
      createElement("div", { class: "refund-info" }, [
        createElement("p", {}, [
          createElement("strong", {}, ["Reason: "]),
          String(refund.reason || "No reason provided."),
        ]),
        createElement("p", { class: "date" }, [`Requested: ${formattedDate}`]),
      ]),
    ])
  ];

  // Append conditional metadata without polluting layout templates with raw booleans
  if (refund.order_type) {
    childrenNodes[1].appendChild(
      createElement("p", {}, [
        createElement("strong", {}, ["Order Type: "]),
        refund.order_type === "farm" ? "Farm Order" : "Regular Order",
      ])
    );
  }

  // Handle active operational action states 
  if (currentStatus === "pending") {
    childrenNodes[1].appendChild(
      createElement("div", { class: "refund-actions" }, [
        createElement("button", {
          class: "btn btn-success btn-sm",
          onclick: (e) => {
            e.preventDefault();
            handleApproveRefund(refund.id, onStateMutated);
          },
        }, ["Approve"]),
        createElement("button", {
          class: "btn btn-danger btn-sm",
          onclick: (e) => {
            e.preventDefault();
            handleRejectRefund(refund.id, onStateMutated);
          },
        }, ["Reject"]),
      ])
    );
  }

  // Handle post-review logging readouts
  if ((currentStatus === "approved" || currentStatus === "rejected" || currentStatus === "completed") && refund.review_notes) {
    const reviewBlock = createElement("div", { class: "review-section" }, [
      createElement("p", {}, [
        createElement("strong", {}, ["Admin Notes: "]),
        refund.review_notes,
      ])
    ]);

    if (refund.reviewed_by) {
      reviewBlock.appendChild(
        createElement("p", { class: "reviewer" }, [`Reviewed by: ${refund.reviewed_by}`])
      );
    }
    childrenNodes[1].appendChild(reviewBlock);
  }

  return createElement("div", { class: `refund-card ${statusClass}` }, childrenNodes);
}

/**
 * Render refund section in order details
 */
export function renderOrderRefundSection(order, onRefundClick) {
  if (!order) return null;
  
  const canRefund = shouldShowRefundOption(order);
  const currentStatus = order.refundStatus || "";
  
  const sectionChildren = [createElement("h4", {}, ["Refund Information"])];

  if (currentStatus && currentStatus !== "none") {
    sectionChildren.push(
      createElement("div", { class: "refund-status-display" }, [
        createElement("p", {}, [
          createElement("strong", {}, ["Status: "]),
          createElement("span", { class: `status-${currentStatus}` }, [
            getRefundStatusLabel(currentStatus),
          ]),
        ]),
      ])
    );
  } else if (canRefund) {
    sectionChildren.push(
      createElement("button", {
        class: "btn btn-warning btn-sm",
        onclick: onRefundClick,
      }, ["Request Refund"])
    );
  } else {
    sectionChildren.push(
      createElement("p", { class: "refund-not-available" }, [
        "This order cannot be refunded at this time.",
      ])
    );
  }

  return createElement("div", { class: "order-refund-section" }, sectionChildren);
}

/**
 * Handle approve refund (admin)
 */
async function handleApproveRefund(refundId, onStateMutated) {
  const notes = prompt("Enter approval notes (optional):");
  if (notes === null) return;

  try {
    await apiFetch(`/refunds/${refundId}/approve`, "POST", {
      notes: notes.trim(),
    });
    alert("Refund approved successfully");
    
    // FIXED: Run application state recovery calls cleanly instead of breaking tab layout execution frames
    if (typeof onStateMutated === "function") {
      onStateMutated();
    } else {
      location.reload();
    }
  } catch (err) {
    console.error("Failed to approve refund:", err);
    alert(`Failed to approve refund: ${err.message || "Unknown error"}`);
  }
}

/**
 * Handle reject refund (admin)
 */
async function handleRejectRefund(refundId, onStateMutated) {
  const notes = prompt("Enter rejection reason (required):");
  if (!notes || notes.trim() === "") {
    alert("Rejection reason is required");
    return;
  }

  try {
    await apiFetch(`/refunds/${refundId}/reject`, "POST", {
      notes: notes.trim(),
    });
    alert("Refund rejected successfully");
    
    if (typeof onStateMutated === "function") {
      onStateMutated();
    } else {
      location.reload();
    }
  } catch (err) {
    console.error("Failed to reject refund:", err);
    alert(`Failed to reject refund: ${err.message || "Unknown error"}`);
  }
}

/**
 * Check if refund option should be shown
 */
function shouldShowRefundOption(order) {
  if (!order) return false;
  
  const isCompleted = ["completed", "delivered"].includes((order.status || "").toLowerCase());
  
  // FIXED: Block additional actions once processing begins
  const hasNoPriorRefundRequests = !order.refundStatus || order.refundStatus === "none";
  
  return isCompleted && hasNoPriorRefundRequests;
}

/**
 * Get readable refund status label
 */
function getRefundStatusLabel(status) {
  const cleanStatus = String(status || "").toLowerCase();
  const labels = {
    pending: "Refund Pending Review",
    approved: "Refund Approved",
    rejected: "Refund Rejected",
    completed: "Refunded",
  };
  return labels[cleanStatus] || status;
}

/**
 * Fetch admin refund requests
 */
export async function fetchAdminRefunds(status = "", orderType = "", skip = 0, limit = 20) {
  try {
    const params = new URLSearchParams({
      skip: String(skip),
      limit: String(limit)
    });
    
    if (status) params.append("status", status);
    if (orderType) params.append("order_type", orderType);
    
    return await apiFetch(`/refunds/all?${params.toString()}`, "GET");
  } catch (err) {
    console.error("Failed to fetch refunds:", err);
    throw err;
  }
}