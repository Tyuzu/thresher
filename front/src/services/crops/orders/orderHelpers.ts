export interface OrderData {
  id?: string | number;
  orderid?: string | number;
  orderId?: string | number;
  OrderID?: string | number;
  status?: string;
  payment?: string;
  [key: string]: unknown;
}

export function normalizeOrderId(order: OrderData | null | undefined): string | number {
  return order?.id ?? order?.orderid ?? order?.orderId ?? order?.OrderID ?? "";
}

const PLACEHOLDER_SET: Set<string> = new Set([
  "",
  "-",
  "none",
  "null",
  "n/a",
  "na",
  "unknown",
  "unknown entity",
]);

function isPlaceholder(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return PLACEHOLDER_SET.has(v);
  }
  return false;
}

export function getOrderValue(order: OrderData | null | undefined, ...keys: string[]): any {
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

export function capitalize(str: unknown): string {
  if (typeof str !== "string" || str.length === 0) {
    return "";
  }

  if (isPlaceholder(str)) {
    return "";
  }

  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function contactBuyer(contact: string | null | undefined): void {
  if (!contact || isPlaceholder(contact)) {
    return;
  }

  window.location.href = `mailto:${contact}`;
}

export function formatOrderDate(value: string | number | Date | null | undefined): string {
  if (!value || isPlaceholder(value)) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString();
}

export function getOrderStatusClass(status: unknown): string {
  const normalized = String(status || "").toLowerCase();

  const statusMap: Record<string, string> = {
    pending: "status-pending",
    accepted: "status-accepted",
    paid: "status-paid",
    delivered: "status-delivered",
    rejected: "status-rejected",
  };

  return statusMap[normalized] || "status-unknown";
}

export function getPaymentStatusClass(payment: unknown): string {
  const normalized = String(payment || "").toLowerCase();

  const paymentMap: Record<string, string> = {
    paid: "payment-paid",
    pending: "payment-pending",
    unpaid: "payment-unpaid",
    failed: "payment-failed",
  };

  return paymentMap[normalized] || "payment-unknown";
}