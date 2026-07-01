import { createElement } from "../../../components/createElement.js";

/* ───────────────── Filtering / Sorting ───────────────── */

function normalizeMoney(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeOrders(orders) {
  return [...orders]
    .sort((a, b) => {
      const aTime = new Date(a.createdAt || a.created_at || 0).getTime();
      const bTime = new Date(b.createdAt || b.created_at || 0).getTime();
      return bTime - aTime;
    })
    .map((order) => ({
      ...order,
      orderId: order.orderId || order.orderid || order.id || order.OrderID || "",
      orderType: order.orderType || (order.farmId ? "farm" : "regular"),
      createdAt: order.createdAt || order.created_at || order.createdAt || "",
      status: order.status || order.orderStatus || "pending",
      paymentMethod: order.paymentMethod || order.payment || order.paymentStatus || "pending",
      address: order.address || order.deliveryAddress || order.shippingAddress || "",
      total: normalizeMoney(order.total),
      subtotal: normalizeMoney(order.subtotal),
      discount: normalizeMoney(order.discount),
      tax: normalizeMoney(order.tax),
      delivery: normalizeMoney(order.delivery),
      approvedBy: Array.isArray(order.approvedBy) ? order.approvedBy.filter(Boolean) : [],
      farmId: order.farmId || order.farmid || "",
      items: order.items || {},
    }));
}

export function getFilteredOrders(orders, filters) {
  const status = (filters.status || "").trim().toLowerCase();
  const date = (filters.date || "").trim();

  return orders.filter((order) => {
    const orderStatus = (order.status || "").trim().toLowerCase();
    const orderDate = toLocalDateKey(order.createdAt || order.created_at);

    if (status && orderStatus !== status) {
      return false;
    }
    if (date && orderDate !== date) {
      return false;
    }

    return true;
  });
}

export function toLocalDateKey(dateStr) {
  if (!dateStr) {
    return "";
  }
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    return "";
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toggleExpanded(state, orderId) {
  if (state.expandedOrders.has(orderId)) {
    state.expandedOrders.delete(orderId);
  } else {
    state.expandedOrders.add(orderId);
  }
}

export function getOrderProducts(order) {
  if (Array.isArray(order?.items?.products)) {
    return order.items.products;
  }

  if (order?.items && typeof order.items === "object" && !Array.isArray(order.items)) {
    const allItems = [];
    for (const category in order.items) {
      const categoryItems = order.items[category];
      if (Array.isArray(categoryItems)) {
        allItems.push(...categoryItems);
      }
    }
    return allItems;
  }

  return [];
}

export function getOrderSummaryMeta(order) {
  return {
    orderId: order.orderId || order.orderid || order.id || order.OrderID || "N/A",
    orderType: order.orderType || (order.farmId ? "farm" : "regular"),
    status: order.status || order.orderStatus || "pending",
    payment: order.paymentMethod || order.payment || order.paymentStatus || "pending",
    address: order.address || order.deliveryAddress || order.shippingAddress || "N/A",
    approvedBy: Array.isArray(order.approvedBy) ? order.approvedBy.filter(Boolean) : [],
    farmId: order.farmId || order.farmid || "N/A",
  };
}

export function capitalize(text = "") {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

export function formatDate(dateStr) {
  if (!dateStr) {
    return "N/A";
  }

  const d = new Date(dateStr);
  return Number.isNaN(d.getTime())
    ? "N/A"
    : d.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

export function formatINR(val = 0, isPaise = false) {
  const rupees = isPaise ? val / 100 : val;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(rupees);
}

/* ───────────────── Actions ───────────────── */

export function downloadReceipt(order) {
  const blob = new Blob([JSON.stringify(order, null, 2)], {
    type: "application/json",
  });

  const link = createElement("a", {
    href: URL.createObjectURL(blob),
    download: `receipt_${order.orderId || order.id || "order"}.json`,
  });

  document.body.append(link);
  link.click();

  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    link.remove();
  }, 1000);
}