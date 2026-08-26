import { apiFetch } from "../../api/api.js";

export async function getCart(): Promise<any> {
  return await apiFetch("/cart", "GET");
}

export async function addCartItem(payload: Record<string, any>): Promise<any> {
  return await apiFetch("/cart", "POST", payload);
}

export async function removeCartItem(payload: Record<string, any>): Promise<any> {
  return await apiFetch("/cart/item", "DELETE", payload);
}

export async function updateCartItem(payload: Record<string, any>): Promise<any> {
  return await apiFetch("/cart/item", "PATCH", payload);
}

export async function clearCart(): Promise<any> {
  return await apiFetch("/cart", "DELETE");
}

export async function updateCartCategory(category: string, items: unknown): Promise<any> {
  return await apiFetch("/cart/update", "POST", { category, items });
}

export async function validateCoupon(code: string, subtotal: number): Promise<any> {
  return await apiFetch("/coupon/validate", "POST", {
    code: code.trim(),
    cart: subtotal,
    entityId: "general",
    entityType: "cart"
  });
}

export async function createCheckoutSession(payload: Record<string, any>): Promise<any> {
  return await apiFetch("/checkout/session", "POST", payload);
}

export async function getMyOrders(): Promise<any> {
  return await apiFetch("/order/mine", "GET");
}

export async function createCartOrder(payload: Record<string, any>): Promise<any> {
  return await apiFetch("/order", "POST", payload);
}

export async function submitRefundRequest(orderId: string, reason: string): Promise<any> {
  return await apiFetch("/refunds/request", "POST", {
    order_id: orderId,
    reason
  });
}

export async function fetchMyRefunds(skip: number = 0, limit: number = 10): Promise<any> {
  return await apiFetch(`/refunds/my-requests?skip=${Number(skip)}&limit=${Number(limit)}`, "GET");
}

export async function approveRefundRequest(refundId: string, notes: string): Promise<any> {
  return await apiFetch(`/refunds/${refundId}/approve`, "POST", {
    notes: notes.trim()
  });
}

export async function rejectRefundRequest(refundId: string, notes: string): Promise<any> {
  return await apiFetch(`/refunds/${refundId}/reject`, "POST", {
    notes: notes.trim()
  });
}

export async function getAdminRefunds(status: string = "", orderType: string = "", skip: number = 0, limit: number = 20): Promise<any> {
  const params = new URLSearchParams({
    skip: String(skip),
    limit: String(limit)
  });

  if (status) params.append("status", status);
  if (orderType) params.append("order_type", orderType);

  return await apiFetch(`/refunds/all?${params.toString()}`, "GET");
}

export default {
  getCart,
  addCartItem,
  removeCartItem,
  updateCartItem,
  clearCart,
  updateCartCategory,
  validateCoupon,
  createCheckoutSession,
  getMyOrders,
  createCartOrder,
  submitRefundRequest,
  fetchMyRefunds,
  approveRefundRequest,
  rejectRefundRequest,
  getAdminRefunds
};
