import { formatCurrency } from "../../types/api.types.js";
import { validateCouponCode as validateCouponCodeApi, requestWalletTopup as requestWalletTopupApi } from "./api.js";

/* ───────────────────────────────────────── */
/* Types & Interfaces */
/* ───────────────────────────────────────── */

export interface CartItem {
  price?: number | string;
  currency?: string;
  quantity?: number | string;
  [key: string]: unknown;
}

export interface CouponValidationResult {
  valid: boolean;
  discount: number;
  reason?: string;
}

export interface CouponApiResponse {
  data?: CouponValidationResult;
  [key: string]: unknown;
}

export interface Transaction {
  id: string | number;
  amount: number;
  [key: string]: unknown;
}

export interface TransactionResponse {
  data?: {
    transactions?: Transaction[];
  };
  transactions?: Transaction[];
}

export interface FormattedTotals {
  subtotal: string;
  tax: string;
  discount: string;
  total: string;
}

export interface OrderTotals {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  display: FormattedTotals;
}

export interface TopupResponse {
  transactionId?: string | number;
  status?: string;
  balance?: number;
  [key: string]: unknown;
}

/* ───────────────────────────────────────── */
/* Utility Functions */
/* ───────────────────────────────────────── */

export function formatTransactionAmount(amount: number): string {
  return formatCurrency(amount);
}

export function formatCartItemPrice(item?: CartItem | null): string {
  if (typeof item?.price === 'number') {
    return formatCurrency(item.price);
  }
  return `${item?.currency || 'INR'} ${item?.price || 0}`;
}

export async function validateCouponCode(
  couponCode: string,
  cartTotal: number
): Promise<CouponValidationResult> {
  if (!couponCode?.trim()) return { valid: false, discount: 0 };
  
  return await validateCouponCodeApi(couponCode, cartTotal);
}

export function formatWalletBalance(balanceInPaise: number): string {
  return formatCurrency(balanceInPaise);
}

export function normalizeTransactionResponse(
  response: TransactionResponse | Transaction[] | null | undefined
): Transaction[] {
  if (response && 'data' in response && response.data?.transactions) {
    return response.data.transactions;
  }
  if (Array.isArray(response)) {
    return response;
  }
  if (response && 'transactions' in response && Array.isArray(response.transactions)) {
    return response.transactions;
  }
  return [];
}

export function calculateOrderTotals(
  items: CartItem[],
  couponDiscount: number = 0
): OrderTotals {
  let subtotal = 0;
  items.forEach(item => {
    subtotal += (Number(item.price) || 0) * (Number(item.quantity) || 0);
  });

  const tax = Math.round(subtotal * 0.18);
  const total = Math.max(0, subtotal + tax - couponDiscount);

  return {
    subtotal,
    tax,
    discount: couponDiscount,
    total,
    display: {
      subtotal: formatCurrency(subtotal),
      tax: formatCurrency(tax),
      discount: formatCurrency(couponDiscount),
      total: formatCurrency(total)
    }
  };
}

export async function requestWalletTopup(
  amount: number,
  paymentMethod: string
): Promise<TopupResponse | undefined> {
  return await requestWalletTopupApi(amount, paymentMethod);
}