import Modal from "../../components/ui/Modal.mjs";
import { stripeFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import { STRIPE_PUB_KEY } from "./pubkey.js";
import { Button } from "../../components/base/Button.js"; // FIXED: Added missing import

/* ───────────────────────────────────────── */
/* Payment Contract Configs */
/* ───────────────────────────────────────── */

const FUNDABLE_ENTITIES = ["artist", "farmer", "creator", "donation", "funding"];

// FIXED: Populated structural methods configuration matrices to resolve map crashes
const PAYMENT_RULES = {
  funding: { 
    allowedEntities: FUNDABLE_ENTITIES,
    methods: ["card", "wallet"] 
  },
  purchase: {
    allowedEntities: [
      "order", "cart", "menu", "booking", "product",
      "ticket", "merch", "crop", "service", "farm"
    ],
    methods: ["card", "wallet", "cash_on_delivery"]
  }
};

function validatePaymentConfig(paymentType, entityType) {
  if (!paymentType || !entityType) {
    return { valid: false, error: "Missing payment type or entity type" };
  }
  const rules = PAYMENT_RULES[paymentType];
  if (!rules) {
    return { valid: false, error: `Unknown payment type: ${paymentType}` };
  }
  if (!rules.allowedEntities.includes(entityType)) {
    return { valid: false, error: `Entity type "${entityType}" not supported for ${paymentType} payments` };
  }
  return { valid: true };
}

/* ───────────────────────────────────────── */
/* Inline Internal Utility Fallbacks */
/* ───────────────────────────────────────── */

function createMessageElement() {
  return createElement("div", { class: "payment-error-msg", style: "color: var(--error, red); margin-top: 8px;" });
}

function setMessage(element, text) {
  if (element) element.textContent = text;
}

// Placeholder fallbacks for alternate processing pipelines
async function payViaWallet(data) {
  console.log("Processing wallet routing:", data);
  return { success: true };
}

async function payCashOnDelivery(data) {
  console.log("Processing cod distribution parameters:", data);
  return { success: true };
}

/* ───────────────────────────────────────── */
/* Stripe Engine Loader */
/* ───────────────────────────────────────── */

let stripePromise = null;
function loadStripeJs(key) {
  if (!stripePromise) {
    stripePromise = new Promise((resolve, reject) => {
      if (window.Stripe) return resolve(window.Stripe(key));
      const script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/";
      script.onload = () => window.Stripe ? resolve(window.Stripe(key)) : reject(new Error("Stripe failed to init"));
      script.onerror = () => reject(new Error("Failed to load Stripe script"));
      document.head.appendChild(script);
    });
  }
  return stripePromise;
}

/* ───────────────────────────────────────── */
/* Stripe Modern Unified Checkout Flow */
/* ───────────────────────────────────────── */

async function payViaStripe({ paymentType = "purchase", entityType, entityId }) {
  const validation = validatePaymentConfig(paymentType, entityType);
  if (!validation.valid) return { success: false, error: validation.error };

  let stripe, clientSecret, elementsInstance = null;

  try {
    stripe = await loadStripeJs(STRIPE_PUB_KEY);
    const res = await stripeFetch("/create-payment-intent", "POST", { paymentType, entityType, entityId });
    if (!res?.clientSecret) throw new Error("Missing client secret from gateway");
    clientSecret = res.clientSecret;
  } catch (err) {
    console.error("Initialization error:", err);
    return { success: false, error: err.message || "Failed to initialize secure checkout panel" };
  }

  let resolveResult;
  const resultPromise = new Promise(r => { resolveResult = r; });

  const modal = Modal({
    title: paymentType === "funding" ? "Support Creator" : "Complete Secure Payment",
    size: "small",
    returnDataOnClose: false,
    content: () => createElement("div", { id: "stripe-checkout-wrapper" }, [
      createElement("div", { id: "payment-element-mount" }),
      createElement("div", { class: "payment-message" })
    ]),
    onOpen: async () => {
      const wrapper = document.getElementById("stripe-checkout-wrapper");
      const msgEl = wrapper.querySelector(".payment-message");

      try {
        elementsInstance = stripe.elements({ clientSecret, appearance: { theme: 'stripe' } });
        const paymentElement = elementsInstance.create("payment", { layout: "tabs" });
        paymentElement.mount("#payment-element-mount");

        const payBtn = createElement("button", { type: "button", class: "btn-primary" }, ["Confirm Payment"]);
        payBtn.addEventListener("click", async () => {
          payBtn.disabled = true;
          msgEl.textContent = "Processing details safely...";

          try {
            const { error, paymentIntent } = await stripe.confirmPayment({
              elements: elementsInstance,
              confirmParams: { return_url: `${window.location.origin}/payment-confirm` },
              redirect: "if_required"
            });

            if (error) throw error;

            await stripeFetch("/payment-success", "POST", {
              paymentType, entityType, entityId, paymentIntentId: paymentIntent.id
            });

            msgEl.textContent = "Payment Verified Successfully!";
            resolveResult({ success: true, paymentIntentId: paymentIntent.id });
            setTimeout(() => modal.close(), 500);
          } catch (err) {
            msgEl.textContent = err.message || "Payment transaction processing failed.";
            payBtn.disabled = false;
          }
        });

        wrapper.appendChild(payBtn);
      } catch (err) {
        msgEl.textContent = "Failed to load secure payment elements.";
        resolveResult({ success: false, error: err.message });
      }
    },
    onClose: () => {
      if (elementsInstance) {
        try { elementsInstance.getElement('payment')?.destroy(); } catch (e) { }
      }
      resolveResult({ success: false, error: "Window closed by customer" });
    }
  });

  return resultPromise;
}

/* ───────────────────────────────────────── */
/* Core Dispatch Master Coordinator Router  */
/* ───────────────────────────────────────── */

async function showPaymentModal({
  paymentType = "purchase",
  entityType,
  entityId,
  entityName
}) {
  const validation = validatePaymentConfig(paymentType, entityType);

  if (!validation.valid) {
    console.warn("Payment validation failed:", validation.error);
    return { success: false, error: validation.error };
  }

  const rules = PAYMENT_RULES[paymentType];
  let modalRef = null;
  const messageEl = createMessageElement();

  const paymentHandlers = {
    card: () => payViaStripe({ paymentType, entityType, entityId }),
    wallet: () => payViaWallet({ paymentType, entityType, entityId }),
    cash_on_delivery: () => payCashOnDelivery({ paymentType, entityType, entityId })
  };

  const confirmBtn = Button(
    "Confirm Payment",
    "",
    {
      click: async () => {
        const method = document.querySelector("input[name=paymethod]:checked")?.value;

        if (!method) {
          setMessage(messageEl, "Select a payment method");
          return;
        }

        const handler = paymentHandlers[method];
        if (!handler) {
          setMessage(messageEl, "Unsupported payment method");
          return;
        }

        confirmBtn.disabled = true;
        const originalText = confirmBtn.textContent;
        confirmBtn.textContent = "Processing…";
        setMessage(messageEl, "");

        try {
          // If paying by card (Stripe), close the first selection panel to prevent interface overlapping 
          if (method === "card") {
            modalRef.close();
          }

          const result = await handler();

          if (result?.success) {
            // If it wasn't a card transaction, we clean up the active selection panel here
            if (method !== "card") {
              modalRef.close({ success: true, method });
            }
            return;
          }

          setMessage(messageEl, result?.error || "Payment failed");
        } catch (err) {
          console.error("Payment processing error:", err);
          setMessage(messageEl, err?.message || "An unexpected error occurred");
        } finally {
          confirmBtn.disabled = false;
          confirmBtn.textContent = originalText;
        }
      }
    },
    "buttonx"
  );

  modalRef = Modal({
    title: `Pay for ${entityName}`,
    content: createElement("div", { class: "payoptions" }, [
      ...rules.methods.map((method, index) =>
        createElement("label", { style: "display: block; margin-bottom: 8px; cursor: pointer;" }, [
          createElement("input", {
            type: "radio",
            name: "paymethod",
            value: method,
            checked: index === 0
          }),
          ` ${method.replaceAll("_", " ").toUpperCase()}`
        ])
      ),
      messageEl
    ]),
    actions: () => confirmBtn,
    returnDataOnClose: true
  });

  return modalRef.closed;
}

export { payViaStripe, showPaymentModal };