import { formatCurrency } from "../../types/api.types.ts";
import { apiFetch } from "../../api/api.js";

export function formatTransactionAmount(amount) {
  return formatCurrency(amount);
}

export function formatCartItemPrice(item) {
  if (typeof item?.price === 'number') {
    return formatCurrency(item.price);
  }
  return `${item?.currency || 'INR'} ${item?.price || 0}`;
}

export async function validateCouponCode(couponCode, cartTotal) {
  if (!couponCode?.trim()) return { valid: false, discount: 0 };
  
  try {
    const response = await apiFetch('/cart/validate-coupon', 'POST', {
      coupon_code: couponCode,
      cart_total: cartTotal
    });
    return response?.data || { valid: false, discount: 0 };
  } catch (error) {
    console.error('Coupon alignment verification error:', error);
    return { valid: false, discount: 0, reason: error.message };
  }
}

export function formatWalletBalance(balanceInPaise) {
  return formatCurrency(balanceInPaise);
}

export function normalizeTransactionResponse(response) {
  if (response?.data?.transactions) return response.data.transactions;
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.transactions)) return response.transactions;
  return [];
}

export function calculateOrderTotals(items, couponDiscount = 0) {
  let subtotal = 0;
  items.forEach(item => {
    subtotal += (Number(item.price) || 0) * (Number(item.quantity) || 0);
  });

  const tax = Math.round(subtotal * 0.18);
  const total = Math.max(0, subtotal + tax - couponDiscount);

  return {
    subtotal, tax, discount: couponDiscount, total,
    display: {
      subtotal: formatCurrency(subtotal),
      tax: formatCurrency(tax),
      discount: formatCurrency(couponDiscount),
      total: formatCurrency(total)
    }
  };
}

export async function requestWalletTopup(amount, paymentMethod) {
  try {
    const res = await apiFetch('/wallet/topup', 'POST', {
      amount,
      payment_method: paymentMethod
    });
    return res?.data;
  } catch (err) {
    console.error("Topup submission broken:", err);
    throw err;
  }
}