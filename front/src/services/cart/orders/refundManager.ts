import { createElement } from "../../../components/createElement.js";
import { RefundRequest, RefundStatus, Order, StateMutatedCallback } from "./types.js";
import {
  approveRefundRequest as approveRefundRequestApi,
  rejectRefundRequest as rejectRefundRequestApi,
  getAdminRefunds,
  submitRefundRequest as submitRefundRequestApi,
  fetchMyRefunds as fetchMyRefundsApi
} from "../api.js";

/**
 * Render refund requests section for admin dashboard
 */
export function renderRefundRequests(
  refunds: RefundRequest[],
  onStateMutated?: StateMutatedCallback
): HTMLElement {
  const safeRefunds = Array.isArray(refunds) ? refunds : [];

  return createElement("div", { class: "refund-requests-section" }, [
    createElement("h2", {}, ["Refund Requests"]),
    safeRefunds.length === 0
      ? createElement("p", { class: "empty-message" }, ["No refund requests"])
      : createElement(
          "div",
          { class: "refund-list" },
          safeRefunds
            .map((refund) => renderRefundCard(refund, onStateMutated))
            .filter((node): node is HTMLElement => node !== null)
        ),
  ]);
}

/**
 * Render a single refund request card
 */
function renderRefundCard(
  refund: RefundRequest | null,
  onStateMutated?: StateMutatedCallback
): HTMLElement | null {
  if (!refund) return null;

  const currentStatus = String(refund.status || "pending").toLowerCase();
  const statusClass = `status-${currentStatus}`;
  const createdDate = new Date(refund.created_at || refund.createdAt || Date.now());

  const formattedDate = Number.isNaN(createdDate.getTime())
    ? "N/A"
    : createdDate.toLocaleDateString() +
      " " +
      createdDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Body container prepared for dynamic append
  const bodyContainer = createElement("div", { class: "refund-body" }, [
    createElement("div", { class: "refund-info" }, [
      createElement("p", {}, [
        createElement("strong", {}, ["Reason: "]),
        String(refund.reason || "No reason provided."),
      ]),
      createElement("p", { class: "date" }, [`Requested: ${formattedDate}`]),
    ]),
  ]);

  const childrenNodes: HTMLElement[] = [
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
    bodyContainer,
  ];

  if (refund.order_type) {
    bodyContainer.appendChild(
      createElement("p", {}, [
        createElement("strong", {}, ["Order Type: "]),
        refund.order_type === "farm" ? "Farm Order" : "Regular Order",
      ])
    );
  }

  if (currentStatus === "pending") {
    bodyContainer.appendChild(
      createElement("div", { class: "refund-actions" }, [
        createElement(
          "button",
          {
            class: "btn btn-success btn-sm",
            type: "button",
            events: {
              click: (e: Event) => {
                e.preventDefault();
                handleApproveRefund(refund.id, onStateMutated);
              },
            },
          },
          ["Approve"]
        ),
        createElement(
          "button",
          {
            class: "btn btn-danger btn-sm",
            type: "button",
            events: {
              click: (e: Event) => {
                e.preventDefault();
                handleRejectRefund(refund.id, onStateMutated);
              },
            },
          },
          ["Reject"]
        ),
      ])
    );
  }

  if (
    (currentStatus === "approved" || currentStatus === "rejected" || currentStatus === "completed") &&
    refund.review_notes
  ) {
    const reviewBlock = createElement("div", { class: "review-section" }, [
      createElement("p", {}, [
        createElement("strong", {}, ["Admin Notes: "]),
        refund.review_notes,
      ]),
    ]);

    if (refund.reviewed_by) {
      reviewBlock.appendChild(
        createElement("p", { class: "reviewer" }, [`Reviewed by: ${refund.reviewed_by}`])
      );
    }
    bodyContainer.appendChild(reviewBlock);
  }

  return createElement("div", { class: `refund-card ${statusClass}` }, childrenNodes);
}

/**
 * Render refund section in order details
 */
export function renderOrderRefundSection(
  order: Order | null,
  onRefundClick: (e: MouseEvent) => void
): HTMLElement | null {
  if (!order) return null;

  const canRefund = canRefundOrder(order);
  const currentStatus = order.refundStatus || "";

  const sectionChildren: HTMLElement[] = [createElement("h4", {}, ["Refund Information"])];

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
      createElement(
        "button",
        {
          class: "btn btn-warning btn-sm",
          type: "button",
          events: { click: onRefundClick as EventListener },
        },
        ["Request Refund"]
      )
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
async function handleApproveRefund(
  refundId: string,
  onStateMutated?: StateMutatedCallback
): Promise<void> {
  const notes = prompt("Enter approval notes (optional):");
  if (notes === null) return;

  try {
    await approveRefundRequestApi(refundId, notes);
    alert("Refund approved successfully");

    if (typeof onStateMutated === "function") {
      onStateMutated();
    } else {
      location.reload();
    }
  } catch (err: any) {
    console.error("Failed to approve refund:", err);
    alert(`Failed to approve refund: ${err?.message || "Unknown error"}`);
  }
}

/**
 * Handle reject refund (admin)
 */
async function handleRejectRefund(
  refundId: string,
  onStateMutated?: StateMutatedCallback
): Promise<void> {
  const notes = prompt("Enter rejection reason (required):");
  if (!notes || notes.trim() === "") {
    alert("Rejection reason is required");
    return;
  }

  try {
    await rejectRefundRequestApi(refundId, notes);
    alert("Refund rejected successfully");

    if (typeof onStateMutated === "function") {
      onStateMutated();
    } else {
      location.reload();
    }
  } catch (err: any) {
    console.error("Failed to reject refund:", err);
    alert(`Failed to reject refund: ${err?.message || "Unknown error"}`);
  }
}

/**
 * Check if refund option should be shown
 */
function shouldShowRefundOption(order: Order | null): boolean {
  return canRefundOrder(order);
}

/**
 * Get readable refund status label
 */
function getRefundStatusLabel(status: string): string {
  const cleanStatus = String(status || "").toLowerCase();
  const labels: Record<string, string> = {
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
export async function fetchAdminRefunds(
  status: string = "",
  orderType: string = "",
  skip: number = 0,
  limit: number = 20
): Promise<RefundRequest[]> {
  try {
    const params = new URLSearchParams({
      skip: String(skip),
      limit: String(limit),
    });

    if (status) params.append("status", status);
    if (orderType) params.append("order_type", orderType);

    return await getAdminRefunds(status, orderType, skip, limit);
  } catch (err) {
    console.error("Failed to fetch refunds:", err);
    throw err;
  }
}

/**
 * Renders an isolated refund request form node.
 */
export function renderRefundRequestForm(
  order: Order | null,
  onClose: (e: MouseEvent) => void,
  onSubmit: (reason: string) => Promise<void>
): HTMLElement {
  if (!order) return createElement("div", {}, ["Missing order details."]);

  const textareaEl = createElement("textarea", {
    class: "form-input",
    rows: "4",
    minlength: "10",
    maxlength: "500",
  }) as HTMLTextAreaElement;
  textareaEl.placeholder = "Please explain why you want to refund this order...";

  const submitBtn = createElement(
    "button",
    {
      class: "btn btn-primary",
      type: "button",
      events: {
        click: async () => {
          const reason = textareaEl.value.trim();
          if (!reason || reason.length < 10) {
            alert("Please provide at least 10 characters explaining the reason");
            return;
          }

          submitBtn.setAttribute("disabled", "true");
          const oldText = submitBtn.textContent || "";
          submitBtn.textContent = "Submitting...";

          try {
            await onSubmit(reason);
          } catch (err) {
            submitBtn.removeAttribute("disabled");
            submitBtn.textContent = oldText;
          }
        },
      },
    },
    ["Submit Refund Request"]
  ) as HTMLButtonElement;

  return createElement("div", { class: "refund-request-form" }, [
    createElement("div", { class: "form-header" }, [
      createElement("h3", {}, ["Request Refund"]),
      createElement(
        "button",
        {
          class: "close-btn",
          type: "button",
          events: { click: onClose as EventListener },
        },
        ["✕"]
      ),
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
      createElement(
        "button",
        {
          class: "btn btn-secondary",
          type: "button",
          events: { click: onClose as EventListener },
        },
        ["Cancel"]
      ),
      submitBtn,
    ]),
  ]);
}

export async function submitRefundRequest(orderId: string, reason: string): Promise<any> {
  try {
    return await submitRefundRequestApi(orderId, reason);
  } catch (err) {
    console.error("Failed to submit refund request:", err);
    throw err;
  }
}

export async function fetchMyRefunds(skip: number = 0, limit: number = 10): Promise<RefundRequest[]> {
  try {
    return await fetchMyRefundsApi(skip, limit);
  } catch (err) {
    console.error("Failed to fetch refund requests:", err);
    throw err;
  }
}

export function renderRefundStatus(order: Order | null): HTMLElement | null {
  if (!order || !order.refundStatus || order.refundStatus === "none") {
    return null;
  }

  const statusClass = `refund-status-${order.refundStatus}`;
  const statusText =
    {
      pending: "Refund Pending",
      approved: "Refund Approved",
      rejected: "Refund Rejected",
      completed: "Refunded",
    }[order.refundStatus as string] || order.refundStatus;

  return createElement("span", { class: `refund-status ${statusClass}` }, [
    String(statusText),
  ]);
}

export function canRefundOrder(order: Order | null): boolean {
  if (!order) return false;

  const isCompleted = ["completed", "delivered"].includes((order.status || "").toLowerCase());
  const hasNoPriorRefundRequests = !order.refundStatus || order.refundStatus === "none";
  const withinWindow = order.createdAt
    ? Date.now() - new Date(order.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000
    : true;

  return isCompleted && hasNoPriorRefundRequests && withinWindow;
}