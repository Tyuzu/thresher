import { apiFetch, stripeFetch } from "../../api/api.js";
import type { Paise } from "../../types/api.types.js";

export interface PaymentIntentRequest {
  paymentType?: string;
  entityType: string;
  entityId: string | number;
}

export interface PaymentIntentResponse {
  clientSecret?: string;
  [key: string]: unknown;
}

export interface PaymentSuccessPayload extends PaymentIntentRequest {
  paymentIntentId: string;
}

export interface WalletBalanceResponse {
  exists?: boolean;
  accountExists?: boolean;
  balance?: number;
  currency?: string;
  [key: string]: unknown;
}

export interface WalletCreateResponse {
  success: boolean;
  message?: string;
  [key: string]: unknown;
}

export interface WalletTopupResponse {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

export interface TransactionItem {
  id: string | number;
  type?: string;
  amount: Paise | number;
  method?: string;
  status?: string;
  created_at: string | number | Date;
  from_account?: string | number;
  userid?: string | number;
  [key: string]: unknown;
}

export interface TransactionResponse {
  transactions?: TransactionItem[];
  [key: string]: unknown;
}

export interface RefundResponse {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

export interface WalletTransferResponse {
  success?: boolean;
  message?: string;
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

export interface TopupResponse {
  transactionId?: string | number;
  status?: string;
  balance?: number;
  [key: string]: unknown;
}

export async function createPaymentIntent(payload: PaymentIntentRequest): Promise<PaymentIntentResponse> {
  return await stripeFetch<PaymentIntentResponse>("/create-payment-intent", "POST", payload);
}

export async function recordPaymentSuccess(payload: PaymentSuccessPayload): Promise<unknown> {
  return await stripeFetch<unknown>("/payment-success", "POST", payload);
}

export async function getWalletBalance(): Promise<WalletBalanceResponse> {
  return await apiFetch<WalletBalanceResponse>("/wallet/balance");
}

export async function createWalletAccount(): Promise<WalletCreateResponse> {
  return await apiFetch<WalletCreateResponse>("/wallet/create", "POST");
}

export async function topupWallet(
  amount: number | Paise,
  method: string,
  idempotencyKey: string
): Promise<WalletTopupResponse> {
  return await apiFetch<WalletTopupResponse>(
    "/wallet/topup",
    "POST",
    { amount, method },
    { headers: { "Idempotency-Key": idempotencyKey } }
  );
}

export async function getWalletTransactions(
  skip: number,
  limit: number
): Promise<TransactionResponse | TransactionItem[]> {
  return await apiFetch<TransactionResponse | TransactionItem[]>(`/wallet/transactions?skip=${skip}&limit=${limit}`);
}

export async function refundWalletTransaction(
  transactionId: string | number,
  idempotencyKey: string
): Promise<RefundResponse> {
  return await apiFetch<RefundResponse>(
    "/wallet/refund",
    "POST",
    { transaction_id: transactionId },
    { headers: { "Idempotency-Key": idempotencyKey } }
  );
}

export async function transferWallet(
  payload: { recipient_id: string; amount: number | Paise; note?: string },
  idempotencyKey: string
): Promise<WalletTransferResponse> {
  return await apiFetch<WalletTransferResponse>("/wallet/transfer", "POST", payload, {
    headers: { "Idempotency-Key": idempotencyKey }
  });
}

export async function validateCouponCode(
  couponCode: string,
  cartTotal: number
): Promise<CouponValidationResult> {
  if (!couponCode?.trim()) return { valid: false, discount: 0 };

  try {
    const response = await apiFetch<CouponApiResponse>("/cart/validate-coupon", "POST", {
      coupon_code: couponCode,
      cart_total: cartTotal
    });
    return response?.data || { valid: false, discount: 0 };
  } catch (error: any) {
    console.error("Coupon alignment verification error:", error);
    return { valid: false, discount: 0, reason: error?.message || "Validation failed" };
  }
}

export async function requestWalletTopup(
  amount: number,
  paymentMethod: string
): Promise<TopupResponse | undefined> {
  try {
    const res = await apiFetch<{ data?: TopupResponse }>('/wallet/topup', 'POST', {
      amount,
      payment_method: paymentMethod
    });
    return res?.data;
  } catch (err) {
    console.error("Topup submission broken:", err);
    throw err;
  }
}
