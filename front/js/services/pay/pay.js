import Modal from "../../components/ui/Modal.mjs";
import { stripeFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import { STRIPE_PUB_KEY } from "./pubkey.js";

/* ───────────────────────────────────────── */
/* Payment Contract Configs */
/* ───────────────────────────────────────── */

const FUNDABLE_ENTITIES = ["artist", "farmer", "creator", "donation", "funding"];

const PAYMENT_RULES = {
  funding: { allowedEntities: FUNDABLE_ENTITIES },
  purchase: {
    allowedEntities: [
      "order", "cart", "menu", "booking", "product",
      "ticket", "merch", "crop", "service", "farm"
    ]
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

  // 1. Fetch payment intent token BEFORE opening modal to prevent broken interface rendering
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
        try { elementsInstance.getElement('payment')?.destroy(); } catch(e){}
      }
      resolveResult({ success: false, error: "Window closed by customer" });
    }
  });

  return resultPromise;
}

export { payViaStripe };