import Button from "../../components/base/Button.js";
import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.js";
import { removeCartItem, updateCartItem, clearCart, updateCartCategory } from "./api.js";

// --- INTERFACES & TYPES ---
export interface CartItem {
  itemId?: string | number;
  id?: string | number;
  entityId?: string | number;
  entityType?: string;
  category?: string;
  quantity?: number;
  price?: number;
  itemName?: string;
  itemType?: string;
  entityName?: string;
  [key: string]: any;
}

export type CartData = Record<string, CartItem[]>;
export type SectionTotals = Record<string, number>;

export interface RenderCartCategoryProps {
  cart?: CartData;
  category?: string;
  contentContainer: HTMLElement;
  sectionTotals?: SectionTotals;
  updateGrandTotal: () => void;
  displayCheckout: (container: HTMLElement, items: CartItem[]) => void;
}

interface QtyTimerContext {
  timerId: ReturnType<typeof setTimeout>;
  resolve?: (value?: unknown) => void;
  promise?: Promise<unknown>;
}

/* ────────────────────── Constants & Helpers ────────────────────── */

const toRupees = (paise: number = 0): number => paise / 100;
const formatPrice = (value: number = 0): string => `₹${value.toFixed(2)}`;
const normalize = (v: any): string => typeof v === "string" ? v.trim().toLowerCase() : "";
const capitalize = (str: string = ""): string => str ? str[0].toUpperCase() + str.slice(1) : "";

const qtyUpdateTimers = new Map<string, QtyTimerContext>();

const getItemIdentityKey = (item: CartItem): string => 
  `${item?.itemId ?? "unknown"}__${item?.entityId ?? "none"}`;

const getQtyTimerKey = (item: CartItem, category: string): string =>
  `${normalize(category)}:${getItemIdentityKey(item)}:${normalize(item?.entityType)}`;

/* ────────────────────── API Layer ────────────────────── */

function buildPayload(base: Record<string, any>, entityId?: string | number, entityType?: string): Record<string, any> {
  const payload = { ...base };
  if (entityId !== undefined && entityId !== null) payload.entityId = entityId;
  if (entityType) payload.entityType = normalize(entityType);
  return payload;
}

export const CartAPI = {
  remove(itemId: string | number, category: string, entityId?: string | number, entityType?: string): Promise<any> {
    return removeCartItem(buildPayload({ itemId, category }, entityId, entityType));
  },

  updateQty(itemId: string | number, category: string, quantity: number, entityId?: string | number, entityType?: string): Promise<any> {
    return updateCartItem(buildPayload({ itemId, category, quantity }, entityId, entityType));
  },

  clear(): Promise<any> {
    return clearCart();
  },

  updateCategory(category: string, items: CartItem[]): Promise<any> {
    return updateCartCategory(category, items);
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
}: RenderCartCategoryProps): void {
  const items = cart[category];

  if (!Array.isArray(items) || !items.length) {
    return;
  }

  // Shadow/Alias items into a non-undefined constant for closure safety
  const categoryItems: CartItem[] = items;

  const section = createElement("section", { class: "cart-category" });
  const cardsContainer = createElement("div", { class: "cart-cards" });
  const subtotalDisplay = createElement("p", { class: "cart-subtotal" });

  const header = createElement("div", { class: "cart-category-header" }, [
    createElement("h3", {}, [])
  ]);

  const checkoutBtn = Button({
    title: "Checkout",
    id: "checkoutbtn",
    events: {
      click: async (e: MouseEvent) => {
        e.preventDefault();
        // FIXED: Flush pending debounce updates to guarantee data consistency before checkout
        await flushCategoryTimers();
        if (categoryItems.length) {
          displayCheckout(contentContainer, categoryItems);
        }
      }
    },
    classes: "buttonx primary"
  });

  section.append(header, cardsContainer, subtotalDisplay, checkoutBtn);
  contentContainer.appendChild(section);

  render();

  /* ────────────────────── Internal Logic ────────────────────── */

  function render(): void {
    if (!categoryItems.length) {
      cleanup();
      return;
    }

    updateHeader();
    renderItems();
    updateTotals();
  }

  function updateHeader(): void {
    const headingEl = header.firstChild as HTMLElement;
    if (headingEl) {
      headingEl.textContent = `${capitalize(category)} (${categoryItems.length})`;
    }
    checkoutBtn.textContent = `Checkout ${capitalize(category)}`;
  }

  function renderItems(): void {
    // FIXED: Build the UI from the current state rather than stale list offsets
    cardsContainer.replaceChildren(
      ...categoryItems.map((item) => createCard(item))
    );
  }

  function updateTotals(): void {
    const subtotal = categoryItems.reduce(
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

  function cleanup(): void {
    for (const item of categoryItems) {
      clearQtyTimer(item);
    }

    section.remove();
    delete cart[category];
    sectionTotals[category] = 0; // Explicitly zero out the key to notify observers safely
    updateGrandTotal();
  }

  function createCard(item: CartItem): HTMLElement {
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

  function createDetails(it: CartItem): HTMLElement {
    const nodes = [createElement("p", {}, [`Item: ${it.itemName || "Item"}`])];
    if (it.itemType) nodes.push(createElement("p", {}, [`Type: ${it.itemType}`]));
    if (it.entityName) {
      nodes.push(createElement("p", {}, [`${it.entityType || "Entity"}: ${it.entityName}`]));
    }
    return createElement("div", { class: "cart-card-details" }, nodes);
  }

  function createQuantityControls(targetKey: string, qty: number): HTMLElement {
    return createElement("div", { class: "quantity-line" }, [
      createElement("span", {}, ["Qty:"]),
      Button({
        title: "−",
        events: { click: () => changeQtyByIdentity(targetKey, -1) },
        classes: "buttonx subtle"
      }),
      createElement("span", { class: "quantity-value" }, [String(qty)]),
      Button({
        title: "+",
        events: { click: () => changeQtyByIdentity(targetKey, 1) },
        classes: "buttonx subtle"
      })
    ]);
  }

  function createPricing(price: number, qty: number): HTMLElement {
    return createElement("div", { class: "cart-card-pricing" }, [
      createElement("p", {}, [`Unit Price: ${formatPrice(price)}`]),
      createElement("p", {}, [`Subtotal: ${formatPrice(price * qty)}`])
    ]);
  }

  function createActions(item: CartItem, targetKey: string): HTMLElement {
    return createElement("div", { class: "action-row" }, [
      Button({
        title: "✕ Remove",
        events: { click: () => handleRemoveByIdentity(item, targetKey) },
        classes: "buttonx danger"
      }),
      Button({
        title: "♡ Save for Later",
        events: {
          click: () => alert(`Saved "${item.itemName || "item"}" for later`)
        },
        classes: "buttonx secondary"
      })
    ]);
  }

  // FIXED: Look up items by identifier key instead of array indices to prevent index shifting bugs
  async function handleRemoveByIdentity(item: CartItem, targetKey: string): Promise<void> {
    try {
      clearQtyTimer(item);

      await CartAPI.remove(
        item.itemId!,
        category,
        item.entityId,
        item.entityType
      );

      const realIndex = categoryItems.findIndex(it => getItemIdentityKey(it) === targetKey);
      if (realIndex !== -1) {
        categoryItems.splice(realIndex, 1);
      }

      Notify("Item removed from cart", { type: "success", duration: 2000 });
      render();
    } catch (err: any) {
      console.error(err);
      Notify("Failed to remove item", { type: "error", duration: 3000 });
    }
  }

  function clearQtyTimer(item: CartItem): void {
    const key = getQtyTimerKey(item, category);
    const executionContext = qtyUpdateTimers.get(key);

    if (executionContext) {
      clearTimeout(executionContext.timerId);
      qtyUpdateTimers.delete(key);
    }
  }

  function scheduleQtyUpdate(item: CartItem): void {
    const key = getQtyTimerKey(item, category);
    clearQtyTimer(item);

    let resolvePromise!: (value?: unknown) => void;
    const flushPromise = new Promise((res) => { resolvePromise = res; });

    const timerId = setTimeout(async () => {
      qtyUpdateTimers.delete(key);
      try {
        await CartAPI.updateQty(
          item.itemId!,
          category,
          item.quantity!,
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

  async function flushCategoryTimers(): Promise<void> {
    const activeFlushes: Promise<void>[] = [];
    for (const [key, ctx] of qtyUpdateTimers.entries()) {
      if (key.startsWith(`${normalize(category)}:`)) {
        clearTimeout(ctx.timerId);
        
        // Execute the microtask immediately
        const task = (async () => {
          qtyUpdateTimers.delete(key);
          const targetItem = categoryItems.find(it => getQtyTimerKey(it, category) === key);
          if (!targetItem) return;
          try {
            await CartAPI.updateQty(
              targetItem.itemId!,
              category,
              targetItem.quantity!,
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

  function changeQtyByIdentity(targetKey: string, delta: number): void {
    const item = categoryItems.find(it => getItemIdentityKey(it) === targetKey);
    if (!item) return;

    const newQty = Math.max(1, (Number(item.quantity) || 1) + delta);
    item.quantity = newQty;
    
    render();
    scheduleQtyUpdate(item);
  }
}

export default renderCartCategory;