import Modal from "../../components/ui/Modal.mjs";
import { createElement } from "../../components/createElement.js";
import { navigate } from "../../routes/index.js";
import { apiFetch } from "../../api/api.js";

/**
 * Opens a robust cart preview drawer modal container.
 */
export async function openCartModal() {
  // 1. Immediately establish container wrapper frame and render local loading UI indicators ahead of network loops
  const wrapper = createElement("div", {
    style: "padding: 1rem; display: flex; flex-direction: column; gap: 1rem; min-height: 120px;"
  });
  
  const loadingIndicator = createElement("p", { style: "text-align: center; color: var(--color-text-muted);" }, ["⏳ Loading cart contents..."]);
  wrapper.appendChild(loadingIndicator);

  // 2. Initialize modal frame context cleanly ahead of long-running network operations
  const modalInstance = Modal({
    title: "Cart Preview",
    content: wrapper,
    size: "medium",
    closeOnOverlayClick: true,
    onClose: () => {
      // FIXED: Safely avoid the destructive circular reference crash
      console.log("Cart preview modal context clean closed.");
    }
  });

  let cart = [];
  try {
    const resp = await apiFetch("/cart", "GET");
    
    // Defensive sanitization: gracefully flatten array maps across raw database storage boundaries
    if (resp && typeof resp === "object") {
      if (Array.isArray(resp)) {
        cart = resp;
      } else {
        cart = Object.values(resp).filter(Boolean).flat();
      }
    }
  } catch (err) {
    console.error("Cart preview network fetch failure:", err);
    wrapper.appendChild(createElement("p", { style: "color: var(--color-error);" }, ["❌ Failed to load cart items."]));
  } finally {
    // Safely eject active loading state indicators from container shell bounds
    loadingIndicator.remove();
  }

  // 3. Build state interface conditions based on cleaned datasets
  if (!cart.length) {
    wrapper.appendChild(createElement("p", { style: "text-align: center; margin: 1.5rem 0;" }, ["🛒 Your cart is empty."]));
    wrapper.appendChild(createElement("p", { style: "text-align: center; font-size: 0.9rem; color: var(--color-text-muted);" }, ["Add items to see them here."]));
  } else {
    const grouped = groupCart(cart);
    const list = createElement("ul", { style: "list-style: none; padding: 0; margin: 0; max-height: 300px; overflow-y: auto;" });

    grouped.forEach(item => {
      const quantity = Number(item.quantity) || 0;
      const basePriceInPaise = Number(item.price) || 0;
      
      const label = `${item.itemName || "Unknown Item"} (${quantity} ${item.unit || "unit"})`;
      const entityInfo = item.entityName ? ` from ${item.entityName}` : "";
      
      // Convert raw backend currency structures cleanly (Paise -> INR)
      const lineItemTotalRupees = (basePriceInPaise / 100) * quantity;
      const priceDisplayString = `₹${lineItemTotalRupees.toFixed(2)}`;

      const li = createElement("li", {
        style: "display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--color-border-light);"
      }, [
        createElement("span", { style: "font-size: 0.95rem;" }, [label + entityInfo]),
        createElement("span", { style: "font-weight: 500;" }, [priceDisplayString])
      ]);
      list.appendChild(li);
    });

    // FIXED: Correct conversion calculation across aggregate matrix boundaries (Paise -> INR conversion match)
    const rawTotalPaise = grouped.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.price) || 0)), 0);
    const grandTotalRupees = rawTotalPaise / 100;

    wrapper.appendChild(createElement("h4", { style: "margin: 0 0 0.5rem 0;" }, ["🛒 Your Cart"]));
    wrapper.appendChild(list);
    wrapper.appendChild(createElement("p", {
      style: "font-weight: bold; text-align: right; margin-top: 1rem; font-size: 1.1rem; color: var(--color-text);"
    }, [`Total: ₹${grandTotalRupees.toFixed(2)}`]));
  }

  // 4. Mount unified system action buttons
  const goToCartButton = createElement("button", {
    style: `
      margin-top: 1rem;
      padding: 0.6rem 1.2rem;
      background-color: var(--color-accent, #007bff);
      color: white;
      border: none;
      border-radius: 4px;
      width: 100%;
      font-weight: 500;
      cursor: pointer;
    `
  }, ["Go to Cart"]);

  goToCartButton.addEventListener("click", (e) => {
    e.preventDefault();
    if (modalInstance && typeof modalInstance.close === "function") {
      modalInstance.close();
    }
    navigate("/cart");
  });

  wrapper.appendChild(goToCartButton);
}

/**
 * Safely compresses multiple product rows matching similar structural identities.
 */
function groupCart(items) {
  if (!Array.isArray(items)) return [];
  
  const map = {};
  items.forEach(it => {
    if (!it) return;
    const key = `${it.itemId || "null"}__${it.entityId || "null"}`;
    if (!map[key]) {
      map[key] = { ...it };
      map[key].quantity = Number(map[key].quantity) || 0;
    } else {
      map[key].quantity += (Number(it.quantity) || 0);
    }
  });
  return Object.values(map);
}