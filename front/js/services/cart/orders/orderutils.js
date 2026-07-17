import { createElement } from "../../../components/createElement.js";

/* ───────────────── Filtering / Sorting ───────────────── */

function normalizeMoney(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Normalizes user order payload parameters into strict local layout configurations.
 * @param {Array} orders - Incoming order matrices from backend microservices.
 * @returns {Array} Clean sorted array data arrays.
 */
export function normalizeOrders(orders) {
  if (!Array.isArray(orders)) return [];

  return [...orders]
    .map((order) => {
      // Unify the timestamp property profile ahead of sorting checks
      const explicitTime = order.createdAt || order.created_at || order.createdTime || order.timestamp || 0;
      
      return {
        ...order,
        orderId: String(order.orderId || order.orderid || order.id || order.OrderID || ""),
        orderType: order.orderType || (order.farmId || order.farmid ? "farm" : "regular"),
        createdAt: explicitTime,
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
      };
    })
    .sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime() || 0;
      const bTime = new Date(b.createdAt).getTime() || 0;
      return bTime - aTime; // Always descending (newest first)
    });
}

export function getFilteredOrders(orders, filters) {
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

export function toLocalDateKey(dateStr) {
  if (!dateStr) return "";
  
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toggleExpanded(state, orderId) {
  if (!state || !state.expandedOrders) return;
  
  if (state.expandedOrders.has(orderId)) {
    state.expandedOrders.delete(orderId);
  } else {
    state.expandedOrders.add(orderId);
  }
}

export function getOrderProducts(order) {
  if (!order || !order.items) return [];

  if (Array.isArray(order.items.products)) {
    return order.items.products;
  }

  if (typeof order.items === "object" && !Array.isArray(order.items)) {
    const allItems = [];
    
    // FIXED: Protect against property iteration pollution from object prototype changes
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

export function getOrderSummaryMeta(order) {
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

export function capitalize(text = "") {
  if (typeof text !== "string") return "";
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

export function formatDate(dateStr) {
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

export function formatINR(val = 0, isPaise = false) {
  const rupees = isPaise ? val / 100 : val;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(rupees);
}

/* ───────────────── Actions ───────────────── */

export function downloadReceipt(order) {
  if (!order) return;

  const blob = new Blob([JSON.stringify(order, null, 2)], {
    type: "application/json",
  });

  const blobUrl = URL.createObjectURL(blob);
  
  const link = createElement("a", {
    href: blobUrl,
    download: `receipt_${order.orderId || "order"}.json`,
    style: "display: none;" // Prevent layout jumping during insertion
  });

  document.body.append(link);
  link.click();

  // FIXED: Proactive garbage cleanup avoids async detached node memory creep 
  link.remove();
  URL.revokeObjectURL(blobUrl);
}