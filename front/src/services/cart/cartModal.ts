// src/ui/cart/cartPage.ts
import { createElement } from "../../components/createElement.js";
import { renderCartCategory, CartItem, CartData, SectionTotals } from "./cartUtils.js";
import { displayCheckout } from "./checkout.js";
import Button from "../../components/base/Button.js";
import { getCart } from "./api.js";

/**
 * Display the user's cart dynamically.
 */
export async function displayCart(content: HTMLElement | null, isLoggedIn: boolean): Promise<void> {
  if (!content) return;

  const container = createElement("div", { class: "cartpage" });
  content.replaceChildren(container);

  if (!isLoggedIn) {
    renderMessage(container, "Please log in to view your cart.");
    return;
  }

  let serverCart: any;
  try {
    serverCart = await getCart();
  } catch (err) {
    console.error("Cart fetch failed:", err);
    renderMessage(container, "Failed to load cart. Try again.");
    return;
  }

  // Maintain a dynamically up-to-date registry mapping categories to their active item states
  const groupedRegistry: CartData = groupCartByCategory(serverCart);
  const categories = Object.keys(groupedRegistry).filter(
    cat => Array.isArray(groupedRegistry[cat]) && groupedRegistry[cat].length
  );

  if (!categories.length) {
    renderMessage(container, "Your cart is empty.");
    return;
  }

  const backButton = createElement("button", {
    type: "button",
    class: "back-button",
    events: {
      click: (e: Event) => {
        e.preventDefault();
        history.back();
      }
    }
  }, ["← Back"]);

  const titleHeader = createElement("h2", {}, ["Your Cart"]);

  container.replaceChildren(backButton, titleHeader);

  const sectionTotals: SectionTotals = {};
  const grandTotalText = createElement("h3", { class: "grand-total" });

  categories.forEach(category => {
    renderCartCategory({
      cart: groupedRegistry, // Pass registry reference down for inline sub-mutations
      category,
      sectionTotals,
      updateGrandTotal,
      displayCheckout,
      contentContainer: container
    });
  });

  const checkoutAllBtn = Button({
    title: "Checkout All",
    id: "checkout-all-btn",
    events: {
      click: () => {
        // Extract fresh items from the current registry state instead of stale closures
        const allItems = Object.values(groupedRegistry).flat().filter(Boolean) as CartItem[];
        
        // Remove zero-quantity or deleted item records before proceeding
        const activeItems = allItems.filter(item => (Number(item.quantity) || 0) > 0);

        if (!activeItems.length) {
          alert("There are no active items in your cart to checkout.");
          return;
        }
        
        displayCheckout(container, activeItems);
      }
    },
    classes: "buttonx primary"
  }) as HTMLButtonElement;

  const grandBox = createElement("div", { class: "grand-box" }, [
    grandTotalText,
    checkoutAllBtn
  ]);

  container.appendChild(grandBox);
  updateGrandTotal();

  /* ---------------- Internals ---------------- */

  function updateGrandTotal(): void {
    const total = Object.values(sectionTotals).reduce(
      (sum, val) => sum + (Number(val) || 0),
      0
    );
    grandTotalText.replaceChildren(`Grand Total: ₹${total.toFixed(2)}`);
    
    // Disable checkout button dynamically if cart total drops to zero
    if (total <= 0) {
      checkoutAllBtn.disabled = true;
    }
  }
}

/**
 * Group cart items by category and merge duplicates safely
 */
function groupCartByCategory(cartData: any): CartData {
  if (!cartData || typeof cartData !== "object") return {};

  let rawItems: CartItem[] = [];
  if (Array.isArray(cartData)) {
    rawItems = cartData;
  } else {
    rawItems = Object.values(cartData).filter(Boolean).flat() as CartItem[];
  }

  const byCategory: Record<string, CartItem[]> = {};
  rawItems.forEach(it => {
    if (!it) return;
    const cat = String(it.category || "unknown").trim().toLowerCase();
    if (!byCategory[cat]) {
      byCategory[cat] = [];
    }
    byCategory[cat].push(it);
  });

  const grouped: CartData = {};
  // Safeguard against prototype pollution using explicit Object.keys looping arrays
  Object.keys(byCategory).forEach(cat => {
    const map: Record<string, CartItem> = {};
    byCategory[cat].forEach(it => {
      if (!it) return;
      const key = `${it.itemId || "null"}__${it.entityId || "null"}`;
      if (!map[key]) {
        map[key] = { ...it };
        map[key].quantity = Number(map[key].quantity) || 0;
      } else {
        map[key].quantity = (Number(map[key].quantity) || 0) + (Number(it.quantity) || 0);
      }
    });
    grouped[cat] = Object.values(map);
  });

  return grouped;
}

function renderMessage(container: HTMLElement, message: string): void {
  if (!container) return;
  container.replaceChildren(createElement("p", { class: "cart-message-info" }, [String(message)]));
}

export default displayCart;