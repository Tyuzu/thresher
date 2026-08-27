// src/ui/cart/checkoutPage.ts
import { createElement } from "../../components/createElement.js";
import { displayPayment } from "./payment.js";
import { getCart, validateCoupon as validateCartCoupon, createCheckoutSession } from "./api.js";

// --- INTERFACES & TYPES ---
export interface CheckoutItem {
  itemId?: string | number;
  id?: string | number;
  price?: number;
  quantity?: number;
  category?: string;
  entityId?: string | number;
  entityType?: string;
  itemName?: string;
  discount?: number;
  [key: string]: any;
}

export interface AddressFormPayload {
  address: string;
  couponCode: string;
}

export interface SummaryProps {
  items: CheckoutItem[];
  address: string;
  couponCode: string;
}

export interface CheckoutHandlerProps {
  container: HTMLElement;
  button: HTMLButtonElement;
  items: CheckoutItem[];
  address: string;
  couponCode: string;
}

/* ────────────────────── Helpers ────────────────────── */

const toRupees = (p: number = 0): number => p / 100;
const formatPrice = (v: number): string => `₹${v.toFixed(2)}`;

const calculateSubtotal = (items: CheckoutItem[] = []): number =>
  items.reduce(
    (sum, i) => sum + toRupees(i.price) * (Number(i.quantity) || 0),
    0
  );

/* ────────────────────── Coupon API (UX only) ────────────────────── */

async function validateCouponPreview({ code, subtotal }: { code: string; subtotal: number }): Promise<{ valid: boolean | null; discount: number; message: string }> {
  if (!code?.trim()) {
    return { valid: null, discount: 0, message: "" };
  }

  try {
    try {
      const res: any = await validateCartCoupon(code, subtotal);

      if (res?.valid) {
        const discount = Math.max(0, Number(res.discount) || 0);
        return {
          valid: true,
          discount,
          message: res.message || `${formatPrice(discount)} discount applied`
        };
      }

      return {
        valid: false,
        discount: 0,
        message: res?.message || "Invalid or expired coupon"
      };
    } catch (err) {
      console.warn("Coupon preview validation failed:", err);
      return {
        valid: null,
        discount: 0,
        message: "Code will be verified at checkout"
      };
    }
  } catch (err) {
    console.error(err);
    return {
      valid: false,
      discount: 0,
      message: "Validation failed"
    };
  }
}

/* ────────────────────── Address Form ────────────────────── */

function renderAddressForm(container: HTMLElement, { items, onSubmit }: { items: CheckoutItem[]; onSubmit: (data: AddressFormPayload) => void }): void {
  const subtotal = calculateSubtotal(items);
  const form = createElement("form", { class: "address-form" }) as HTMLFormElement;

  const addressInput = createElement("textarea", {
    required: true,
    rows: "3",
    class: "address-input",
    placeholder: "Flat No, Street, City, State, ZIP"
  }) as HTMLTextAreaElement;

  const couponInput = createElement("input", {
    type: "text",
    class: "coupon-input",
    placeholder: "Enter coupon code (optional)"
  }) as HTMLInputElement;

  const feedback = createElement("div", { class: "coupon-feedback" });
  const submitBtn = createElement("button", { class: "primary-button", type: "submit" }, [
    "Proceed to Checkout"
  ]) as HTMLButtonElement;

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let requestId = 0;
  let isValidating = false; // FIXED: Lock form transition during flight network processing

  const couponState = {
    code: "",
    valid: null as boolean | null,
    discount: 0
  };

  const executeValidation = async (code: string) => {
    const currentRequest = ++requestId;
    isValidating = true;
    submitBtn.disabled = true;
    feedback.replaceChildren("Validating…");

    try {
      const result = await validateCouponPreview({ code, subtotal });
      
      if (currentRequest !== requestId) return;

      couponState.valid = result.valid;
      couponState.discount = result.discount;

      feedback.replaceChildren(
        createElement(
          "span",
          { style: `color:${result.valid ? "green" : "red"}` },
          [result.message]
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      if (currentRequest === requestId) {
        isValidating = false;
        submitBtn.disabled = false;
      }
    }
  };

  couponInput.addEventListener("input", () => {
    const code = couponInput.value.trim();
    couponState.code = code;

    if (debounceTimer) clearTimeout(debounceTimer);

    if (!code) {
      couponState.valid = null;
      couponState.discount = 0;
      isValidating = false;
      submitBtn.disabled = false;
      feedback.replaceChildren("");
      return;
    }

    debounceTimer = setTimeout(() => executeValidation(code), 400);
  });

  form.onsubmit = async (e: Event) => {
    e.preventDefault();

    // FIXED: Catch rapid submission attempts while validation timers are actively in-flight
    if (isValidating) {
      if (debounceTimer) clearTimeout(debounceTimer);
      await executeValidation(couponState.code);
    }

    if (couponState.code && couponState.valid === false) {
      alert("Invalid coupon code entered.");
      return;
    }

    onSubmit({
      address: addressInput.value.trim(),
      couponCode: couponState.code
    });
  };

  form.append(
    createElement("h2", {}, ["Delivery Details"]),
    createElement("label", {}, ["Address", addressInput]),
    createElement("label", {}, ["Coupon", couponInput, feedback]),
    submitBtn
  );

  container.replaceChildren(form);
}

/* ────────────────────── Summary View ────────────────────── */

function renderSummary(container: HTMLElement, { items, address, couponCode }: SummaryProps): void {
  const subtotal = calculateSubtotal(items);
  const itemDiscountTotal = items.reduce((sum, i) => {
    const price = toRupees(i.price);
    const discountPercent = Number(i.discount || 0);
    const lineDiscount = discountPercent > 0 ? price * (discountPercent / 100) * (Number(i.quantity) || 0) : 0;
    return sum + lineDiscount;
  }, 0);

  const summary = createElement("section", { class: "checkout-summary" });

  const list = createElement(
    "ul",
    {},
    items.map(i => {
      const price = toRupees(i.price);
      const lineTotal = price * (Number(i.quantity) || 0);

      return createElement("li", {}, [
        `${i.itemName || "Item"} – ${i.quantity} × ${formatPrice(price)} `,
        createElement("strong", {}, [`= ${formatPrice(lineTotal)}`])
      ]);
    })
  );

  const totals = createElement("div", {}, [
    createElement("div", {}, [`Subtotal: ${formatPrice(subtotal)}`]),
    itemDiscountTotal > 0
      ? createElement("div", { style: "color:#e53935;font-weight:bold" }, [`Item discount: −${formatPrice(itemDiscountTotal)}`])
      : null,
    couponCode
      ? createElement("div", { style: "color:#e53935;font-weight:bold" }, [`Coupon Code Applied: ${couponCode}`])
      : null,
    createElement(
      "div",
      { style: "font-weight:bold; margin-top: 8px;" },
      ["Final total will be calculated securely at payment"]
    )
  ].filter(Boolean) as HTMLElement[]);

  const btn = createElement(
    "button",
    { class: "primary-button" },
    ["Proceed to Payment"]
  ) as HTMLButtonElement;

  btn.onclick = (e: MouseEvent) => {
    e.preventDefault();
    handleCheckout({
      container,
      button: btn,
      items,
      address,
      couponCode
    });
  };

  summary.append(
    createElement("h2", {}, ["Checkout Summary"]),
    list,
    totals,
    btn
  );

  container.replaceChildren(summary);
}

/* ────────────────────── Checkout Handler ────────────────────── */

async function handleCheckout({
  container,
  button,
  items,
  address,
  couponCode
}: CheckoutHandlerProps): Promise<void> {
  button.disabled = true;
  button.textContent = "Processing…";

  try {
    const itemsByCategory = groupByCategory(items);

    const session: any = await createCheckoutSession({
      address,
      items: itemsByCategory,
      coupon: couponCode || null
    });

    displayPayment(container, {
      ...session,
      couponCode
    });
  } catch (err: any) {
    console.error(err);
    button.disabled = false;
    button.textContent = "Proceed to Payment";
    alert(err?.message || "Checkout failed. Please try again.");
  }
}

/**
 * Group items by category for checkout
 * SECURITY: Never send prices to backend - backend looks them up from database
 */
function groupByCategory(items: CheckoutItem[] | Record<string, CheckoutItem[]> = []): Record<string, CheckoutItem[]> {
  const grouped: Record<string, CheckoutItem[]> = {};
  
  // Flatten union input into a clean single array of CheckoutItem
  const normalizedItems: CheckoutItem[] = Array.isArray(items)
    ? items
    : Object.values(items || {}).flat();
  
  normalizedItems.forEach(item => {
    if (!item) return;
    const category = item.category || "products";
    
    if (!grouped[category]) {
      grouped[category] = [];
    }
    
    grouped[category].push({
      itemId: item.itemId || item.id,
      quantity: Number(item.quantity) || 1,
      category: item.category,
      entityId: item.entityId,
      entityType: item.entityType,
      // FIXED: Maintain non-pricing presentation properties downstream transparently
      itemName: item.itemName,
      discount: item.discount
    });
  });
  
  return grouped;
}

/* ────────────────────── Main Entry ────────────────────── */

export async function displayCheckout(container: HTMLElement | null, passedItems: CheckoutItem[] | Record<string, CheckoutItem[]> | null = null): Promise<void> {
  if (!container) return;
  
  container.replaceChildren(
    createElement("p", { class: "loading" }, ["Loading Details..."])
  );

  try {
    let items: CheckoutItem[];
    
    if (!passedItems) {
      const cartData: any = await getCart();
      items = Array.isArray(cartData) 
        ? cartData 
        : Object.values(cartData || {}).filter(Boolean).flat() as CheckoutItem[];
    } else {
      // FIXED: Safely verify collection alignment shape before calling flattening maps
      items = Array.isArray(passedItems) 
        ? passedItems 
        : Object.values(passedItems || {}).filter(Boolean).flat() as CheckoutItem[];
    }

    if (!items.length) {
      container.replaceChildren(
        createElement("p", { class: "empty" }, ["Nothing to checkout"])
      );
      return;
    }

    renderAddressForm(container, {
      items,
      onSubmit: data =>
        renderSummary(container, {
          items,
          ...data
        })
    });
  } catch (err) {
    console.error(err);
    container.replaceChildren(
      createElement("div", { class: "error" }, ["Failed to load cart configuration"])
    );
  }
}

export default displayCheckout;