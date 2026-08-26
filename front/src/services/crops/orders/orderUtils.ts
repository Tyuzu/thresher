import { OrderData } from "./orderHelpers";
import {
  acceptFarmOrder,
  rejectFarmOrder,
  deliverFarmOrder,
  markFarmOrderPaid,
  bulkAcceptFarmOrders,
  bulkRejectFarmOrders,
  bulkDeliverFarmOrders,
  fetchIncomingFarmOrders
} from "../api.js";

export interface OrderFilters {
  status?: string;
  crop?: string;
  payment?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface BulkOperationResponse {
  success: boolean;
  updated: number;
  failed: number;
  message: string;
  errors: string[];
}

// Single Order Actions
export async function acceptOrder(orderId: string | number): Promise<boolean> {
  try {
    const response = await acceptFarmOrder(orderId);
    return Boolean(response?.success);
  } catch (err) {
    console.error(`Failed to accept order ${orderId}:`, err);
    return false;
  }
}

export async function rejectOrder(orderId: string | number): Promise<boolean> {
  try {
    const response = await rejectFarmOrder(orderId);
    return Boolean(response?.success);
  } catch (err) {
    console.error(`Failed to reject order ${orderId}:`, err);
    return false;
  }
}

export async function markOrderDelivered(orderId: string | number): Promise<boolean> {
  try {
    const response = await deliverFarmOrder(orderId);
    return Boolean(response?.success);
  } catch (err) {
    console.error(`Failed to mark order ${orderId} as delivered:`, err);
    return false;
  }
}

export async function markOrderPaid(orderId: string | number): Promise<boolean> {
  try {
    const response = await markFarmOrderPaid(orderId);
    return Boolean(response?.success);
  } catch (err) {
    console.error(`Failed to mark order ${orderId} as paid:`, err);
    return false;
  }
}

// Bulk Order Actions
export async function bulkAcceptOrders(orderIds: (string | number)[]): Promise<BulkOperationResponse> {
  try {
    const response = await bulkAcceptFarmOrders(orderIds);

    return {
      success: Boolean(response?.success),
      updated: response?.updated || 0,
      failed: response?.failed || 0,
      message: response?.message || "",
      errors: response?.errors || [],
    };
  } catch (err: any) {
    console.error("Failed to bulk accept orders:", err);

    return {
      success: false,
      updated: 0,
      failed: Array.isArray(orderIds) ? orderIds.length : 0,
      message: "Failed to bulk accept orders",
      errors: [err?.message || "Unknown error"],
    };
  }
}

export async function bulkRejectOrders(orderIds: (string | number)[]): Promise<BulkOperationResponse> {
  try {
    const response = await bulkRejectFarmOrders(orderIds);

    return {
      success: Boolean(response?.success),
      updated: response?.updated || 0,
      failed: response?.failed || 0,
      message: response?.message || "",
      errors: response?.errors || [],
    };
  } catch (err: any) {
    console.error("Failed to bulk reject orders:", err);

    return {
      success: false,
      updated: 0,
      failed: Array.isArray(orderIds) ? orderIds.length : 0,
      message: "Failed to bulk reject orders",
      errors: [err?.message || "Unknown error"],
    };
  }
}

export async function bulkMarkOrdersDelivered(orderIds: (string | number)[]): Promise<BulkOperationResponse> {
  try {
    const response = await bulkDeliverFarmOrders(orderIds);

    return {
      success: Boolean(response?.success),
      updated: response?.updated || 0,
      failed: response?.failed || 0,
      message: response?.message || "",
      errors: response?.errors || [],
    };
  } catch (err: any) {
    console.error("Failed to bulk mark orders as delivered:", err);

    return {
      success: false,
      updated: 0,
      failed: Array.isArray(orderIds) ? orderIds.length : 0,
      message: "Failed to bulk mark orders as delivered",
      errors: [err?.message || "Unknown error"],
    };
  }
}

// Fetch Orders
export async function fetchIncomingOrders(filters: OrderFilters = {}): Promise<OrderData[]> {
  try {
    const params = new URLSearchParams();

    if (filters.status) params.append("status", filters.status);
    if (filters.crop) params.append("crop", filters.crop);
    if (filters.payment) params.append("payment", filters.payment);
    if (filters.date) params.append("date", filters.date);
    if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.append("dateTo", filters.dateTo);

    const url = params.toString()
      ? `/orders/incoming?${params.toString()}`
      : "/orders/incoming";

    const response = await fetchIncomingFarmOrders(url);

    if (!response?.success || !Array.isArray(response.orders)) {
      throw new Error("Invalid response");
    }

    return response.orders;
  } catch (err) {
    console.error("Failed to fetch incoming orders:", err);
    throw err;
  }
}