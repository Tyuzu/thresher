import "../../../css/subpages/payoptions.css";
import Modal from "../../components/ui/Modal.js";
import { createElement } from "../../components/createElement.js";
import { STRIPE_PUB_KEY } from "./pubkey.js";
import { Button } from "../../components/base/Button.js";
import { createPaymentIntent, recordPaymentSuccess } from "./api.js";

/* ───────────────────────────────────────── */
/* Types & Interfaces */
/* ───────────────────────────────────────── */

export type PaymentType = "funding" | "purchase";

export type PaymentMethod = "card" | "wallet" | "cash_on_delivery";

export interface PaymentConfig {
  allowedEntities: string[];
  methods: PaymentMethod[];
}

export type PaymentRules = Record<PaymentType, PaymentConfig>;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface StripePaymentParams {
  paymentType?: PaymentType;
  entityType: string;
  entityId: string | number;
}

export interface ShowPaymentModalParams extends StripePaymentParams {
  entityName: string;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  method?: PaymentMethod;
  error?: string;
  redirectingToStripe?: boolean;
}

// Global ambient declaration for Stripe JS SDK
declare global {
  interface Window {
    Stripe?: (key: string) => any;
  }
}

/* ───────────────────────────────────────── */
/* Payment Contract Configs */
/* ───────────────────────────────────────── */

const FUNDABLE_ENTITIES: string[] = ["artist", "farmer", "creator", "donation", "funding"];

const PAYMENT_RULES: PaymentRules = {
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

function validatePaymentConfig(paymentType: PaymentType, entityType: string): ValidationResult {
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

function createMessageElement(): HTMLElement {
  return createElement("div", { class: "payment-error-msg", style: "color: var(--error, red); margin-top: 8px;" });
}

function setMessage(element: HTMLElement | null, text: string): void {
  if (element) element.textContent = text;
}

// Placeholder fallbacks for alternate processing pipelines
async function payViaWallet(data: StripePaymentParams): Promise<PaymentResult> {
  console.log("Processing wallet routing:", data);
  return { success: true, method: "wallet" };
}

async function payCashOnDelivery(data: StripePaymentParams): Promise<PaymentResult> {
  console.log("Processing cod distribution parameters:", data);
  return { success: true, method: "cash_on_delivery" };
}

/* ───────────────────────────────────────── */
/* Stripe Engine Loader */
/* ───────────────────────────────────────── */

let stripePromise: Promise<any> | null = null;

function loadStripeJs(key: string): Promise<any> {
  if (!stripePromise) {
    stripePromise = new Promise((resolve, reject) => {
      if (window.Stripe) return resolve(window.Stripe(key));
      const script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/";
      script.async = true;
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

async function payViaStripe({ paymentType = "purchase", entityType, entityId }: StripePaymentParams): Promise<PaymentResult> {
  const validation = validatePaymentConfig(paymentType, entityType);
  if (!validation.valid) return { success: false, error: validation.error };

  let stripe: any;
  let clientSecret: string;
  let elementsInstance: any = null;

  try {
    stripe = await loadStripeJs(STRIPE_PUB_KEY);
    const res = await createPaymentIntent({ paymentType, entityType, entityId });
    if (!res?.clientSecret) throw new Error("Missing client secret from gateway");
    clientSecret = res.clientSecret;
  } catch (err: any) {
    console.error("Initialization error:", err);
    return { success: false, error: err.message || "Failed to initialize secure checkout panel" };
  }

  let isSettled = false;
  let resolveResult: (value: PaymentResult) => void;
  const resultPromise = new Promise<PaymentResult>(r => { resolveResult = r; });

  const safeResolve = (result: PaymentResult) => {
    if (!isSettled) {
      isSettled = true;
      resolveResult(result);
    }
  };

  const modal = Modal({
    title: paymentType === "funding" ? "Support Creator" : "Complete Secure Payment",
    size: "small",
    returnDataOnClose: false,
    content: () => createElement("div", { id: "stripe-checkout-wrapper" }, [
      createElement("div", { id: "payment-element-mount" }),
      createElement("div", { class: "payment-message" })
    ]),
    onOpen: async () => {
      const wrapper = document.getElementById("stripe-checkout-wrapper") as HTMLElement;
      const msgEl = wrapper.querySelector(".payment-message") as HTMLElement;

      try {
        elementsInstance = stripe.elements({ clientSecret, appearance: { theme: 'stripe' } });
        const paymentElement = elementsInstance.create("payment", { layout: "tabs" });
        paymentElement.mount("#payment-element-mount");

        const payBtn = Button({
          title: "Confirm Payment",
          classes: "btn-primary",
          type: "button",
          events: {
            click: async () => {
              payBtn.disabled = true;
              msgEl.textContent = "Processing details safely...";

              try {
                const { error, paymentIntent } = await stripe.confirmPayment({
                  elements: elementsInstance,
                  confirmParams: { return_url: `${window.location.origin}/payment-confirm` },
                  redirect: "if_required"
                });

                if (error) throw error;

                await recordPaymentSuccess({
                  paymentType,
                  entityType,
                  entityId,
                  paymentIntentId: paymentIntent.id
                });

                msgEl.textContent = "Payment Verified Successfully!";
                safeResolve({ success: true, paymentIntentId: paymentIntent.id, method: "card" });
                setTimeout(() => modal.close(), 500);
              } catch (err: any) {
                msgEl.textContent = err.message || "Payment transaction processing failed.";
                payBtn.disabled = false;
              }
            }
          }
        });

        wrapper.appendChild(payBtn);
      } catch (err: any) {
        msgEl.textContent = "Failed to load secure payment elements.";
        safeResolve({ success: false, error: err.message });
      }
    },
    onClose: () => {
      if (elementsInstance) {
        try { elementsInstance.getElement('payment')?.destroy(); } catch (e) { }
        elementsInstance = null;
      }
      safeResolve({ success: false, error: "Window closed by customer" });
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
}: ShowPaymentModalParams): Promise<PaymentResult> {
  const validation = validatePaymentConfig(paymentType, entityType);

  if (!validation.valid) {
    console.warn("Payment validation failed:", validation.error);
    return { success: false, error: validation.error };
  }

  const rules = PAYMENT_RULES[paymentType];
  let modalRef: any = null;
  const messageEl = createMessageElement();

  const paymentHandlers: Record<PaymentMethod, () => Promise<PaymentResult>> = {
    card: () => payViaStripe({ paymentType, entityType, entityId }),
    wallet: () => payViaWallet({ paymentType, entityType, entityId }),
    cash_on_delivery: () => payCashOnDelivery({ paymentType, entityType, entityId })
  };

  const confirmBtn = Button({
    title: "Confirm Payment",
    classes: "buttonx",
    events: {
      click: async () => {
        const selectedInput = document.querySelector("input[name=paymethod]:checked") as HTMLInputElement | null;
        const method = selectedInput?.value as PaymentMethod | undefined;

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
        const originalText = confirmBtn.textContent || "";
        confirmBtn.textContent = "Processing…";
        setMessage(messageEl, "");

        try {
          if (method === "card") {
            modalRef.close({ redirectingToStripe: true });
            await handler();
          } else {
            const result = await handler();

            if (result?.success) {
              modalRef.close({ success: true, method });
            } else {
              setMessage(messageEl, result?.error || "Payment failed");
            }
          }
        } catch (err: any) {
          console.error("Payment processing error:", err);
          setMessage(messageEl, err?.message || "An unexpected error occurred");
        } finally {
          confirmBtn.disabled = false;
          confirmBtn.textContent = originalText;
        }
      }
    }
  });

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