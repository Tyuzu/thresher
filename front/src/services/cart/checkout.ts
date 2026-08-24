// src/ui/cart/checkoutPage.js
import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import { displayPayment } from "./payment.js";

/* ────────────────────── Helpers ────────────────────── */

const toRupees = (p = 0) => p / 100;
const formatPrice = v => `₹${v.toFixed(2)}`;

const calculateSubtotal = (items = []) =>
  items.reduce(
    (sum, i) => sum + toRupees(i.price) * (Number(i.quantity) || 0),
    0
  );

/* ────────────────────── Coupon API (UX only) ────────────────────── */

async function validateCoupon({ code, subtotal }) {
  if (!code?.trim()) {
    return { valid: null, discount: 0, message: "" };
  }

  try {
    try {
      const res = await apiFetch("/coupon/validate", "POST", {
        code: code.trim(),
        cart: subtotal,
        entityId: "general",
        entityType: "cart"
      });

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

function renderAddressForm(container, { items, onSubmit }) {
  const subtotal = calculateSubtotal(items);
  const form = createElement("form", { class: "address-form" });

  const addressInput = createElement("textarea", {
    required: true,
    rows: "3",
    class: "address-input",
    placeholder: "Flat No, Street, City, State, ZIP"
  });

  const couponInput = createElement("input", {
    type: "text",
    class: "coupon-input",
    placeholder: "Enter coupon code (optional)"
  });

  const feedback = createElement("div", { class: "coupon-feedback" });
  const submitBtn = createElement("button", { class: "primary-button", type: "submit" }, [
    "Proceed to Checkout"
  ]);

  let debounceTimer = null;
  let requestId = 0;
  let isValidating = false; // FIXED: Lock form transition during flight network processing

  const couponState = {
    code: "",
    valid: null,
    discount: 0
  };

  const executeValidation = async (code) => {
    const currentRequest = ++requestId;
    isValidating = true;
    submitBtn.disabled = true;
    feedback.replaceChildren("Validating…");

    try {
      const result = await validateCoupon({ code, subtotal });
      
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

  form.onsubmit = async (e) => {
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

function renderSummary(container, { items, address, couponCode }) {
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
  ].filter(Boolean));

  const btn = createElement(
    "button",
    { class: "primary-button" },
    ["Proceed to Payment"]
  );

  btn.onclick = (e) => {
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
}) {
  button.disabled = true;
  button.textContent = "Processing…";

  try {
    const itemsByCategory = groupByCategory(items);

    const session = await apiFetch("/checkout/session", "POST", {
      address,
      items: itemsByCategory,
      coupon: couponCode || null
    });

    displayPayment(container, {
      ...session,
      couponCode
    });
  } catch (err) {
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
function groupByCategory(items = []) {
  const grouped = {};
  const normalizedItems = Array.isArray(items) ? items : Object.values(items || {});
  
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

export async function displayCheckout(container, passedItems = null) {
  if (!container) return;
  
  container.replaceChildren(
    createElement("p", { class: "loading" }, ["Loading Details..."])
  );

  try {
    let items = passedItems;
    
    if (!items) {
      const cartData = await apiFetch("/cart", "GET");
      items = Array.isArray(cartData) 
        ? cartData 
        : Object.values(cartData || {}).filter(Boolean).flat();
    } else {
      // FIXED: Safely verify collection alignment shape before calling flattening maps
      items = Array.isArray(passedItems) 
        ? passedItems 
        : Object.values(passedItems || {}).filter(Boolean).flat();
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