// src/ui/cart/cartPage.js
import { createElement } from "../../components/createElement.js";
import { renderCartCategory } from "./cartUtils.js";
import { apiFetch } from "../../api/api.js";
import { displayCheckout } from "./checkout.js";
import Button from "../../components/base/Button.js";

/**
 * Display the user's cart dynamically.
 */
export async function displayCart(content, isLoggedIn) {
  const container = createElement("div", { class: "cartpage" });
  content.replaceChildren(container);

  if (!isLoggedIn) {
    renderMessage(container, "Please log in to view your cart.");
    return;
  }

  let serverCart;
  try {
    serverCart = await apiFetch("/cart", "GET");
  } catch (err) {
    console.error("Cart fetch failed:", err);
    renderMessage(container, "Failed to load cart. Try again.");
    return;
  }

  // FIXED: Maintain a dynamically up-to-date registry mapping categories to their active item states
  const groupedRegistry = groupCartByCategory(serverCart);
  const categories = Object.keys(groupedRegistry).filter(
    cat => Array.isArray(groupedRegistry[cat]) && groupedRegistry[cat].length
  );

  if (!categories.length) {
    renderMessage(container, "Your cart is empty.");
    return;
  }

  container.replaceChildren(
    createElement(
      "button",
      { class: "back-button", onclick: (e) => { e.preventDefault(); history.back(); } },
      ["← Back"]
    ),
    createElement("h2", {}, ["Your Cart"])
  );

  const sectionTotals = {};
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

  const checkoutAllBtn = Button(
    "Checkout All",
    "checkout-all-btn",
    {
      click: () => {
        // FIXED: Extract fresh items from the current registry state instead of stale closures
        const allItems = Object.values(groupedRegistry).flat().filter(Boolean);
        
        // Remove zero-quantity or deleted item records before proceeding
        const activeItems = allItems.filter(item => (Number(item.quantity) || 0) > 0);

        if (!activeItems.length) {
          alert("There are no active items in your cart to checkout.");
          return;
        }
        
        displayCheckout(container, activeItems);
      }
    },
    "buttonx primary"
  );

  const grandBox = createElement("div", { class: "grand-box" }, [
    grandTotalText,
    checkoutAllBtn
  ]);

  container.appendChild(grandBox);
  updateGrandTotal();

  /* ---------------- Internals ---------------- */

  function updateGrandTotal() {
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
function groupCartByCategory(cartData) {
  if (!cartData || typeof cartData !== "object") return {};

  // FIXED: Defensively handle both flat array payloads and categorized object structures safely
  let rawItems = [];
  if (Array.isArray(cartData)) {
    rawItems = cartData;
  } else {
    rawItems = Object.values(cartData).filter(Boolean).flat();
  }

  const byCategory = {};
  rawItems.forEach(it => {
    if (!it) return;
    const cat = String(it.category || "unknown").trim().toLowerCase();
    if (!byCategory[cat]) {
      byCategory[cat] = [];
    }
    byCategory[cat].push(it);
  });

  const grouped = {};
  // FIXED: Safeguard against prototype pollution using explicit Object.keys looping arrays
  Object.keys(byCategory).forEach(cat => {
    const map = {};
    byCategory[cat].forEach(it => {
      if (!it) return;
      const key = `${it.itemId || "null"}__${it.entityId || "null"}`;
      if (!map[key]) {
        map[key] = { ...it };
        map[key].quantity = Number(map[key].quantity) || 0;
      } else {
        map[key].quantity += (Number(it.quantity) || 0);
      }
    });
    grouped[cat] = Object.values(map);
  });

  return grouped;
}

function renderMessage(container, message) {
  if (!container) return;
  container.replaceChildren(createElement("p", { class: "cart-message-info" }, [String(message)]));
}