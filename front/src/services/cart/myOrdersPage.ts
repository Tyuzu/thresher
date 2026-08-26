import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import { buildOrdersPage } from "./orders/builders.js";
import { normalizeOrders } from "./orders/orderutils.js";

// --- INTERFACES & TYPES ---
export interface OrderItem {
  id?: string | number;
  itemId?: string | number;
  name?: string;
  quantity?: number;
  price?: number;
  [key: string]: any;
}

export interface Order {
  id?: string | number;
  orderId?: string | number;
  orderid?: string | number;
  status?: string;
  created_at?: string | number;
  items?: OrderItem[];
  [key: string]: any;
}

export interface OrderFilters {
  status: string;
  date: string;
  [key: string]: any;
}

export interface OrdersState {
  orders: Order[];
  loading: boolean;
  filters: OrderFilters;
  currentPage: number;
  expandedOrders: Set<string | number>;
  [key: string]: any;
}

/**
 * Renders and coordinates the User Orders page.
 * @param {HTMLElement} container - Target parent node element wrapper.
 * @param {boolean} isLoggedIn - Authentication state.
 */
export async function displayMyOrders(
  container: HTMLElement | null,
  isLoggedIn?: boolean
): Promise<void> {
  if (!container || !container.nodeType) {
    console.error("displayMyOrders: Missing DOM container element.");
    return;
  }

  container.replaceChildren();

  if (!isLoggedIn) {
    container.append(
      createElement("p", {}, ["You must be logged in to view your orders."])
    );
    return;
  }

  // Reactive state store
  const state: OrdersState = {
    orders: [],
    loading: true, // Let builders flag loading views if needed
    filters: {
      status: "",
      date: "",
    },
    currentPage: 1,
    expandedOrders: new Set<string | number>(),
  };

  const render = () => {
    container.replaceChildren(buildOrdersPage(state, render));
  };

  // Initial immediate draw (shows skeleton UI / empty state with current filters)
  render();

  try {
    const res: any = await apiFetch("/order/mine", "GET");

    // Handle both array response and wrapped object response structure configurations safely
    const ordersData = Array.isArray(res) ? res : res?.orders;
    if (!ordersData || !Array.isArray(ordersData)) {
      throw new Error("Invalid format received from orders data provider engine.");
    }

    state.loading = false;
    state.orders = normalizeOrders(ordersData);
    
    // SAFE UPDATE: We leave state.filters and state.expandedOrders completely alone 
    // so any interaction made during transmission isn't erased.
    render();
  } catch (err: any) {
    console.error("Failed to fetch user orders:", err);
    state.loading = false;
    
    container.replaceChildren(
      createElement("section", { class: "user-orders-page" }, [
        createElement("h2", {}, ["My Orders"]),
        createElement("p", { class: "error-msg" }, ["Failed to load orders. Please try again later."]),
      ])
    );
  }
}

export default displayMyOrders;