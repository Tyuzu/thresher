/* eslint-disable no-console */
import { createElement } from "../../components/createElement.js";
import { showPaymentModal } from "../pay/pay.js";
import Notify from "../../components/ui/Notify.js";
import Button from "../../components/base/Button.js";
import { printInvoice } from "./invoice.js";
import { createCartOrder } from "./api.js";

// --- INTERFACES & TYPES ---
interface OrderItem {
  itemId?: string | number;
  quantity?: number;
  category?: string;
  entityId?: string | number;
  entityType?: string;
  price?: number;
  itemName?: string;
  name?: string;
  [key: string]: any;
}

interface SessionData {
  items?: OrderItem[] | Record<string, OrderItem[]>;
  category?: string;
  address?: string;
  couponCode?: string;
  [key: string]: any;
}

interface OrderPayload {
  address?: string;
  items: Record<string, OrderItem[]>;
  coupon?: string | null;
}

interface OrderData {
  orderid?: string | number;
  orderId?: string | number;
  OrderID?: string | number;
  subtotal?: number;
  discount?: number;
  tax?: number;
  delivery?: number;
  total?: number;
  totalAmount?: number;
  [key: string]: any;
}

/* ────────────────────── Helpers ────────────────────── */

const formatINR = (value: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR"
  }).format(value);

const toRupees = (paise?: number): number => (paise || 0) / 100;

const flattenItems = (items: OrderItem[] | Record<string, OrderItem[]> = []): OrderItem[] =>
  Array.isArray(items)
    ? items
    : Object.values(items || {}).flat();

function groupByCategory(items: OrderItem[] = []): Record<string, OrderItem[]> {
  return items.reduce((acc: Record<string, OrderItem[]>, item) => {
    const key = item.category;

    if (!key) {
      console.error("Missing category on item:", item);
      return acc;
    }

    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push({
      itemId: item.itemId,
      quantity: item.quantity,
      category: item.category,
      entityId: item.entityId,
      entityType: item.entityType
    });

    return acc;
  }, {});
}

/* ────────────────────── Renderers ────────────────────── */

function renderItems(items: OrderItem[] | Record<string, OrderItem[]>): HTMLElement {
  const list = createElement("ul", {});

  flattenItems(items).forEach(item => {
    const price = toRupees(item.price);
    // FIXED: Calculate total in integer paise first to prevent floating point variations
    const total = toRupees((item.price || 0) * (item.quantity || 0));
    const name = item.itemName || item.name || "Item";

    list.append(
      createElement("li", {}, [
        `${name} – ${item.quantity} × ${formatINR(price)} = `,
        createElement("strong", {}, [formatINR(total)])
      ])
    );
  });

  return list;
}

function renderTotalsFromBackend(order: OrderData): HTMLElement {
  const subtotal = toRupees(order.subtotal || 0);
  const discount = toRupees(order.discount || 0);
  const tax = toRupees(order.tax || 0);
  const delivery = toRupees(order.delivery || 0);
  const total = toRupees(order.total || 0);

  return createElement("div", { class: "payment-totals" }, [
    createElement("div", {}, [`Subtotal: ${formatINR(subtotal)}`]),

    ...(discount > 0
      ? [
          createElement(
            "div",
            { class: "discount-line" },
            [`Discount: −${formatINR(discount)}`]
          )
        ]
      : []),

    createElement("div", {}, [`Tax: ${formatINR(tax)}`]),
    createElement("div", {}, [`Delivery: ${formatINR(delivery)}`]),
    createElement("div", { class: "total-line" }, [`Total: ${formatINR(total)}`])
  ]);
}

/* ────────────────────── API ────────────────────── */

async function createOrder({ items, address, couponCode }: { items: OrderItem[]; address?: string; couponCode?: string }): Promise<OrderData & { orderid: string | number; total: number }> {
  const payload: OrderPayload = {
    address,
    items: groupByCategory(items),
    coupon: couponCode || null
  };

  const res: any = await createCartOrder(payload);

  if (!res?.success) {
    throw new Error(res?.message || "Order creation failed");
  }

  const order = res?.farmOrders?.[0] || res?.order;
  const orderId = order?.orderid || order?.orderId || order?.OrderID;

  if (!orderId) {
    console.error("Invalid order response:", res);
    throw new Error("Missing order ID");
  }

  return {
    ...order,
    orderid: orderId,
    total: order?.total || order?.totalAmount || 0
  };
}

async function processPayment(orderId: string | number, total: number): Promise<any> {
  // FIXED: Propagate error rejections up so the main catch block knows why it failed
  return await showPaymentModal({
    paymentType: "purchase",
    entityType: "order",
    entityId: orderId,
    entityName: "Order"
  });
}

/* ────────────────────── Main Entry ────────────────────── */

export function displayPayment(container: HTMLElement, sessionData: SessionData = {}): void {
  container.replaceChildren(
    createElement("h2", {}, ["Order Summary"])
  );

  let items = flattenItems(sessionData.items);
  let createdOrder: (OrderData & { orderid: string | number; total: number }) | null = null; // FIXED: State variable to track an already created order tracking reference

  if (sessionData.category) {
    items = items.filter(item => item.category === sessionData.category);
  }

  container.append(
    createElement("h3", {}, ["Delivery Address"]),
    createElement("p", {}, [sessionData.address || "N/A"]),
    createElement("h3", {}, ["Items"]),
    renderItems(items)
  );

  const totalsContainer = createElement("div", {});
  container.append(totalsContainer);

  const confirmBtn = Button({
    title: "Pay & Place Order",
    id: "confirm-order-btn",
    events: { click: () => handleConfirm() },
    classes: "primary-button"
  });

  container.append(confirmBtn);

  async function handleConfirm() {
    if (confirmBtn.hasAttribute("disabled") || (confirmBtn as HTMLButtonElement).disabled) return;
    
    (confirmBtn as HTMLButtonElement).disabled = true;
    confirmBtn.textContent = "Processing…";

    try {
      // FIXED: If payment failed previously, don't hit the createOrder endpoint again. Reuse the created one.
      if (!createdOrder) {
        createdOrder = await createOrder({
          items,
          address: sessionData.address,
          couponCode: sessionData.couponCode
        });
      }

      totalsContainer.replaceChildren(
        renderTotalsFromBackend(createdOrder)
      );

      if ((createdOrder.discount || 0) > 0) {
        Notify(`Discount applied: ${formatINR(toRupees(createdOrder.discount))}`, {
          type: "success",
          duration: 2000
        });
      }

      const paymentResult = await processPayment(
        createdOrder.orderid,
        toRupees(createdOrder.total)
      );

      if (!paymentResult) {
        throw new Error("Payment window closed or cancelled.");
      }

      const successContainer = createElement(
        "div",
        { class: "success-message" },
        [
          createElement("h3", {}, ["Order placed successfully"]),
          createElement("p", {}, [`Order ID: ${createdOrder.orderid}`])
        ]
      );

      const printBtn = Button({
        title: "Print Invoice",
        id: "print-invoice-btn",
        events: { click: () => printInvoice(createdOrder!, items) },
        classes: "secondary-button"
      });

      successContainer.append(printBtn);
      container.replaceChildren(successContainer);
      
    } catch (err: any) {
      console.error("Checkout process error:", err);

      Notify(err?.message || "Order processing failed", {
        type: "error",
        duration: 4000
      });

      (confirmBtn as HTMLButtonElement).disabled = false;
      confirmBtn.textContent = createdOrder ? "Retry Payment" : "Pay & Place Order";
    }
  }
}

export default displayPayment;