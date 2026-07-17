import { apiFetch } from "../../api/api.js";
import Button from "../../components/base/Button.js";
import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.mjs";

/* ────────────────────── Constants & Helpers ────────────────────── */

const toRupees = (paise = 0) => paise / 100;
const formatPrice = (value = 0) => `₹${value.toFixed(2)}`;
const normalize = (v) => typeof v === "string" ? v.trim().toLowerCase() : "";
const capitalize = (str = "") => str ? str[0].toUpperCase() + str.slice(1) : "";

const qtyUpdateTimers = new Map();

const getItemIdentityKey = (item) => 
  `${item?.itemId ?? "unknown"}__${item?.entityId ?? "none"}`;

const getQtyTimerKey = (item, category) =>
  `${normalize(category)}:${getItemIdentityKey(item)}:${normalize(item?.entityType)}`;

/* ────────────────────── API Layer ────────────────────── */

function buildPayload(base, entityId, entityType) {
  const payload = { ...base };
  if (entityId) payload.entityId = entityId;
  if (entityType) payload.entityType = normalize(entityType);
  return payload;
}

export const CartAPI = {
  remove(itemId, category, entityId, entityType) {
    return apiFetch(
      "/cart/item",
      "DELETE",
      buildPayload({ itemId, category }, entityId, entityType)
    );
  },

  updateQty(itemId, category, quantity, entityId, entityType) {
    return apiFetch(
      "/cart/item",
      "PATCH",
      buildPayload({ itemId, category, quantity }, entityId, entityType)
    );
  },

  clear() {
    return apiFetch("/cart", "DELETE");
  },

  updateCategory(category, items) {
    return apiFetch("/cart/update", "POST", { category, items });
  }
};

/* ────────────────────── Main Renderer ────────────────────── */

export function renderCartCategory({
  cart = {},
  category = "",
  contentContainer,
  sectionTotals = {},
  updateGrandTotal,
  displayCheckout
}) {
  const items = cart[category];

  if (!Array.isArray(items) || !items.length) {
    return;
  }

  const section = createElement("section", { class: "cart-category" });
  const cardsContainer = createElement("div", { class: "cart-cards" });
  const subtotalDisplay = createElement("p", { class: "cart-subtotal" });

  const header = createElement("div", { class: "cart-category-header" }, [
    createElement("h3", {}, [])
  ]);

  const checkoutBtn = Button(
    "Checkout",
    "checkoutbtn",
    {
      click: async (e) => {
        e.preventDefault();
        // FIXED: Flush pending debounce updates to guarantee data consistency before checkout
        await flushCategoryTimers();
        if (items.length) {
          displayCheckout(contentContainer, items);
        }
      }
    },
    "buttonx primary"
  );

  section.append(header, cardsContainer, subtotalDisplay, checkoutBtn);
  contentContainer.appendChild(section);

  render();

  /* ────────────────────── Internal Logic ────────────────────── */

  function render() {
    if (!items.length) {
      cleanup();
      return;
    }

    updateHeader();
    renderItems();
    updateTotals();
  }

  function updateHeader() {
    header.firstChild.textContent = `${capitalize(category)} (${items.length})`;
    checkoutBtn.textContent = `Checkout ${capitalize(category)}`;
  }

  function renderItems() {
    // FIXED: Build the UI from the current state rather than stale list offsets
    cardsContainer.replaceChildren(
      ...items.map((item) => createCard(item))
    );
  }

  function updateTotals() {
    const subtotal = items.reduce(
      (sum, x) => sum + toRupees(x.price) * (Number(x.quantity) || 1),
      0
    );

    sectionTotals[category] = subtotal;
    updateGrandTotal();

    subtotalDisplay.replaceChildren(
      createElement("strong", {}, ["Subtotal: "]),
      formatPrice(subtotal)
    );
  }

  function cleanup() {
    for (const item of items) {
      clearQtyTimer(item);
    }

    section.remove();
    delete cart[category];
    sectionTotals[category] = 0; // Explicitly zero out the key to notify observers safely
    updateGrandTotal();
  }

  function createCard(item) {
    const price = toRupees(item.price);
    const qty = Number(item.quantity) || 1;
    const targetKey = getItemIdentityKey(item);

    return createElement("div", { class: "cart-card", "data-item-key": targetKey }, [
      createDetails(item),
      createQuantityControls(targetKey, qty),
      createPricing(price, qty),
      createActions(item, targetKey)
    ]);
  }

  function createDetails(it) {
    const nodes = [createElement("p", {}, [`Item: ${it.itemName || "Item"}`])];
    if (it.itemType) nodes.push(createElement("p", {}, [`Type: ${it.itemType}`]));
    if (it.entityName) {
      nodes.push(createElement("p", {}, [`${it.entityType || "Entity"}: ${it.entityName}`]));
    }
    return createElement("div", { class: "cart-card-details" }, nodes);
  }

  function createQuantityControls(targetKey, qty) {
    return createElement("div", { class: "quantity-line" }, [
      createElement("span", {}, ["Qty:"]),
      Button("−", "", { click: () => changeQtyByIdentity(targetKey, -1) }, "buttonx subtle"),
      createElement("span", { class: "quantity-value" }, [String(qty)]),
      Button("+", "", { click: () => changeQtyByIdentity(targetKey, 1) }, "buttonx subtle")
    ]);
  }

  function createPricing(price, qty) {
    return createElement("div", { class: "cart-card-pricing" }, [
      createElement("p", {}, [`Unit Price: ${formatPrice(price)}`]),
      createElement("p", {}, [`Subtotal: ${formatPrice(price * qty)}`])
    ]);
  }

  function createActions(item, targetKey) {
    return createElement("div", { class: "action-row" }, [
      Button(
        "✕ Remove",
        "",
        { click: () => handleRemoveByIdentity(item, targetKey) },
        "buttonx danger"
      ),
      Button(
        "♡ Save for Later",
        "",
        {
          click: () => alert(`Saved "${item.itemName || "item"}" for later`)
        },
        "buttonx secondary"
      )
    ]);
  }

  // FIXED: Look up items by identifier key instead of array indices to prevent index shifting bugs
  async function handleRemoveByIdentity(item, targetKey) {
    try {
      clearQtyTimer(item);

      await CartAPI.remove(
        item.itemId,
        category,
        item.entityId,
        item.entityType
      );

      const realIndex = items.findIndex(it => getItemIdentityKey(it) === targetKey);
      if (realIndex !== -1) {
        items.splice(realIndex, 1);
      }

      Notify("Item removed from cart", { type: "success", duration: 2000 });
      render();
    } catch (err) {
      console.error(err);
      Notify("Failed to remove item", { type: "error", duration: 3000 });
    }
  }

  function clearQtyTimer(item) {
    const key = getQtyTimerKey(item, category);
    const executionContext = qtyUpdateTimers.get(key);

    if (executionContext) {
      clearTimeout(executionContext.timerId);
      qtyUpdateTimers.delete(key);
    }
  }

  function scheduleQtyUpdate(item) {
    const key = getQtyTimerKey(item, category);
    clearQtyTimer(item);

    let resolvePromise;
    const flushPromise = new Promise((res) => { resolvePromise = res; });

    const timerId = setTimeout(async () => {
      qtyUpdateTimers.delete(key);
      try {
        await CartAPI.updateQty(
          item.itemId,
          category,
          item.quantity,
          item.entityId,
          item.entityType
        );
      } catch (err) {
        console.error(err);
        Notify("Failed to update quantity", { type: "error", duration: 3000 });
      } finally {
        resolvePromise();
      }
    }, 300);

    // Save both the timer and completion handler for safety flushes
    qtyUpdateTimers.set(key, { timerId, resolve: resolvePromise, promise: flushPromise });
  }

  async function flushCategoryTimers() {
    const activeFlushes = [];
    for (const [key, ctx] of qtyUpdateTimers.entries()) {
      if (key.startsWith(`${normalize(category)}:`)) {
        clearTimeout(ctx.timerId);
        
        // Execute the microtask immediately
        const task = (async () => {
          qtyUpdateTimers.delete(key);
          const targetItem = items.find(it => getQtyTimerKey(it, category) === key);
          if (!targetItem) return;
          try {
            await CartAPI.updateQty(
              targetItem.itemId,
              category,
              targetItem.quantity,
              targetItem.entityId,
              targetItem.entityType
            );
          } catch (e) {
            console.error("Flush failure:", e);
          }
        })();
        activeFlushes.push(task);
      }
    }
    if (activeFlushes.length) {
      await Promise.all(activeFlushes);
    }
  }

  function changeQtyByIdentity(targetKey, delta) {
    const item = items.find(it => getItemIdentityKey(it) === targetKey);
    if (!item) return;

    const newQty = Math.max(1, (Number(item.quantity) || 1) + delta);
    item.quantity = newQty;
    
    render();
    scheduleQtyUpdate(item);
  }
}