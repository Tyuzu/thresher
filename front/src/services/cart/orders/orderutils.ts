// orderutils.ts

import { createElement } from "../../../components/createElement.js";
import { Order, OrderFilters, OrderItem, OrderPageState } from "./types.js";

function normalizeMoney(value: any): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Normalizes user order payload parameters into strict local layout configurations.
 */
export function normalizeOrders(orders: Record<string, any>[]): Order[] {
  if (!Array.isArray(orders)) return [];

  return [...orders]
    .map((order): Order => {
      const explicitTime =
        order["createdAt"] || order["created_at"] || order["createdTime"] || order["timestamp"] || 0;

      return {
        ...order,
        orderId: String(order["orderId"] || order["orderid"] || order["id"] || order["OrderID"] || ""),
        orderType: order["orderType"] || (order["farmId"] || order["farmid"] ? "farm" : "regular"),
        createdAt: explicitTime,
        status: order["status"] || order["orderStatus"] || "pending",
        paymentMethod: order["paymentMethod"] || order["payment"] || order["paymentStatus"] || "pending",
        address: order["address"] || order["deliveryAddress"] || order["shippingAddress"] || "",
        total: normalizeMoney(order["total"]),
        subtotal: normalizeMoney(order["subtotal"]),
        discount: normalizeMoney(order["discount"]),
        tax: normalizeMoney(order["tax"]),
        delivery: normalizeMoney(order["delivery"]),
        approvedBy: Array.isArray(order["approvedBy"]) ? order["approvedBy"].filter(Boolean) : [],
        farmId: order["farmId"] || order["farmid"] || "",
        items: order["items"] || {},
      };
    })
    .sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime() || 0;
      const bTime = new Date(b.createdAt).getTime() || 0;
      return bTime - aTime;
    });
}

export function getFilteredOrders(orders: Order[], filters?: OrderFilters): Order[] {
  if (!Array.isArray(orders)) return [];

  const status = (filters?.status || "").trim().toLowerCase();
  const date = (filters?.date || "").trim();

  return orders.filter((order) => {
    const orderStatus = (order.status || "").trim().toLowerCase();
    const orderDate = toLocalDateKey(order.createdAt);

    if (status && orderStatus !== status) {
      return false;
    }
    if (date && orderDate !== date) {
      return false;
    }

    return true;
  });
}

export function toLocalDateKey(dateStr: string | number): string {
  if (!dateStr) return "";

  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toggleExpanded(state: OrderPageState, orderId: string): void {
  if (!state || !state.expandedOrders) return;

  if (state.expandedOrders.has(orderId)) {
    state.expandedOrders.delete(orderId);
  } else {
    state.expandedOrders.add(orderId);
  }
}

export function getOrderProducts(order: Order | null): OrderItem[] {
  if (!order || !order.items) return [];

  if (Array.isArray(order.items.products)) {
    return order.items.products;
  }

  if (typeof order.items === "object" && !Array.isArray(order.items)) {
    const allItems: OrderItem[] = [];

    Object.keys(order.items).forEach((category) => {
      const categoryItems = order.items[category];
      if (Array.isArray(categoryItems)) {
        allItems.push(...categoryItems);
      }
    });

    return allItems;
  }

  return [];
}

export function getOrderSummaryMeta(order: Order | null) {
  if (!order) return {};

  return {
    orderId: order.orderId || "N/A",
    orderType: order.orderType || "regular",
    status: order.status || "pending",
    payment: order.paymentMethod || "pending",
    address: order.address || "N/A",
    approvedBy: Array.isArray(order.approvedBy) ? order.approvedBy : [],
    farmId: order.farmId || "N/A",
  };
}

export function capitalize(text: string = ""): string {
  if (typeof text !== "string") return "";
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

export function formatDate(dateStr: string | number): string {
  if (!dateStr) return "N/A";

  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? "N/A"
    : d.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

export function formatINR(val: number = 0, isPaise: boolean = false): string {
  const rupees = isPaise ? val / 100 : val;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(rupees);
}

export function downloadReceipt(order: Order | null): void {
  if (!order) return;

  const blob = new Blob([JSON.stringify(order, null, 2)], {
    type: "application/json",
  });

  const blobUrl = URL.createObjectURL(blob);

  const link = createElement("a", {
    href: blobUrl,
    download: `receipt_${order.orderId || "order"}.json`,
    style: "display: none;",
  }) as HTMLAnchorElement;

  document.body.append(link);
  link.click();

  link.remove();
  URL.revokeObjectURL(blobUrl);
}