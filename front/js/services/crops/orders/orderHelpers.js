export function normalizeOrderId(order) {
  return order?.id ?? order?.orderid ?? order?.orderId ?? order?.OrderID ?? "";
}

const PLACEHOLDER_SET = new Set(["", "-", "none", "null", "n/a", "na", "unknown", "unknown entity"]);

function isPlaceholder(value) {
  if (value === undefined || value === null) {
return true;
}
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return PLACEHOLDER_SET.has(v);
  }
  return false;
}

export function getOrderValue(order, ...keys) {
  for (const key of keys) {
    const value = order?.[key];
    if (isPlaceholder(value)) {
continue;
}
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return "";
}

export function capitalize(str) {
  if (typeof str !== "string" || str.length === 0) {
    return "";
  }

  if (isPlaceholder(str)) {
return "";
}

  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function contactBuyer(contact) {
  if (!contact || isPlaceholder(contact)) {
    return;
  }

  window.location.href = `mailto:${contact}`;
}

export function formatOrderDate(value) {
  if (!value || isPlaceholder(value)) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString();
}

export function getOrderStatusClass(status) {
  const normalized = String(status || "").toLowerCase();

  const statusMap = {
    pending: "status-pending",
    accepted: "status-accepted",
    paid: "status-paid",
    delivered: "status-delivered",
    rejected: "status-rejected",
  };

  return statusMap[normalized] || "status-unknown";
}

export function getPaymentStatusClass(payment) {
  const normalized = String(payment || "").toLowerCase();

  const paymentMap = {
    paid: "payment-paid",
    pending: "payment-pending",
    unpaid: "payment-unpaid",
    failed: "payment-failed",
  };

  return paymentMap[normalized] || "payment-unknown";
}