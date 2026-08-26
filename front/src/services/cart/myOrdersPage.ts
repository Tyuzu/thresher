import { createElement } from "../../components/createElement.js";
import { buildOrdersPage } from "./orders/builders.js";
import { normalizeOrders } from "./orders/orderutils.js";
import { OrderPageState } from "./orders/types.js";
import { getMyOrders } from "./api.js";

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

  // Reactive state store (use canonical OrderPageState)
  const state: OrderPageState = {
    orders: [],
    filters: {
      status: "",
      date: "",
    },
    currentPage: 1,
    expandedOrders: new Set<string>(),
  } as unknown as OrderPageState;

  const render = () => {
    container.replaceChildren(buildOrdersPage(state, render));
  };

  // Initial immediate draw (shows skeleton UI / empty state with current filters)
  render();

  try {
    const res: any = await getMyOrders();

    // Handle both array response and wrapped object response structure configurations safely
    const ordersData = Array.isArray(res) ? res : res?.orders;
    if (!ordersData || !Array.isArray(ordersData)) {
      throw new Error("Invalid format received from orders data provider engine.");
    }

    (state as any).loading = false;
    state.orders = normalizeOrders(ordersData);
    
    // SAFE UPDATE: We leave state.filters and state.expandedOrders completely alone 
    // so any interaction made during transmission isn't erased.
    render();
  } catch (err: any) {
    console.error("Failed to fetch user orders:", err);
    (state as any).loading = false;
    
    container.replaceChildren(
      createElement("section", { class: "user-orders-page" }, [
        createElement("h2", {}, ["My Orders"]),
        createElement("p", { class: "error-msg" }, ["Failed to load orders. Please try again later."]),
      ])
    );
  }
}

export default displayMyOrders;