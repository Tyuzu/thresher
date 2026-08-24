import { createElement } from "../../../components/createElement.js";
import Button from "../../../components/base/Button.js";
import {
  capitalize,
  contactBuyer,
  formatOrderDate,
  getOrderStatusClass,
  getPaymentStatusClass,
  getOrderValue,
  normalizeOrderId,
  OrderData,
} from "./orderHelpers.js";
import {
  markOrderDelivered,
  markOrderPaid,
  rejectOrder,
  acceptOrder,
} from "./orderUtils.js";

function canAccept(status: unknown): boolean {
  return String(status || "").toLowerCase() === "pending";
}

function canMarkPaid(status: unknown): boolean {
  return String(status || "").toLowerCase() === "accepted";
}

function canDeliver(status: unknown): boolean {
  return String(status || "").toLowerCase() === "paid";
}

function canReject(status: unknown): boolean {
  const normalized = String(status || "").toLowerCase();
  return normalized === "pending" || normalized === "accepted";
}

type RefreshCallback = () => void;
type ContactHandler = (contact: string) => void;
type ActionHandler = (orderId: string | number) => Promise<void>;

export function renderOrdersTable(orderList: OrderData[], onRefresh?: RefreshCallback): HTMLElement {
  const handleContact: ContactHandler = (contact) => contactBuyer(contact);

  const handleAccepted: ActionHandler = async (orderId) => {
    const success = await acceptOrder(orderId);
    if (success) {
      onRefresh?.();
    }
  };

  const handleMarkedPaid: ActionHandler = async (orderId) => {
    const success = await markOrderPaid(orderId);
    if (success) {
      onRefresh?.();
    }
  };

  const handleDelivered: ActionHandler = async (orderId) => {
    const success = await markOrderDelivered(orderId);
    if (success) {
      onRefresh?.();
    }
  };

  const handleReject: ActionHandler = async (orderId) => {
    const success = await rejectOrder(orderId);
    if (success) {
      onRefresh?.();
    }
  };

  const headerRow = createElement("tr", {}, [
    createElement("th", {}, [
      createElement("input", { type: "checkbox", id: "select-all-orders" }),
    ]),
    ...[
      "Order ID",
      "Buyer",
      "Contact",
      "Farm",
      "Crop",
      "Qty",
      "Order Date",
      "Delivery Date",
      "Address",
      "Payment",
      "Status",
      "Actions",
    ].map((header) => createElement("th", {}, [header])),
  ]);

  const bodyRows =
    orderList.length === 0
      ? [
          createElement("tr", {}, [
            createElement("td", { colspan: 13 }, ["No orders found."]),
          ]),
        ]
      : orderList.map((order) =>
          buildOrderTableRow(order, handleContact, handleAccepted, handleMarkedPaid, handleDelivered, handleReject)
        );

  return createElement("table", { class: "orders-table" }, [
    createElement("thead", {}, [headerRow]),
    createElement("tbody", {}, bodyRows),
  ]);
}

function buildOrderTableRow(
  order: OrderData,
  onContact: ContactHandler,
  onAccepted: ActionHandler,
  onMarkedPaid: ActionHandler,
  onDelivered: ActionHandler,
  onReject: ActionHandler
): HTMLElement {
  const orderId = normalizeOrderId(order);
  const statusClass = getOrderStatusClass(order.status);
  const paymentClass = getPaymentStatusClass(order.payment);
  const buyerName = getOrderValue(order, "buyer", "name", "customerName") || "—";
  const contact = getOrderValue(order, "contact", "phone", "email") || "";
  const farmName = getOrderValue(order, "farm", "farmName", "farmid") || "—";
  const cropName = getOrderValue(order, "crop", "cropName", "itemName", "productName") || "—";
  const quantity = getOrderValue(order, "qty", "quantity", "requestedQty");
  const unit = getOrderValue(order, "unit", "itemUnit") || "";
  const address = getOrderValue(order, "address", "deliveryAddress", "shippingAddress") || "—";
  const payment = capitalize(getOrderValue(order, "payment", "paymentMethod") || "pending");
  const status = capitalize(getOrderValue(order, "status") || "pending");

  return createElement("tr", {}, [
    createElement("td", {}, [
      createElement("input", { type: "checkbox", class: "select-order", value: orderId }),
    ]),
    createElement("td", {}, [orderId]),
    createElement("td", {}, [buyerName]),
    createElement("td", {}, [contact]),
    createElement("td", {}, [farmName]),
    createElement("td", {}, [cropName]),
    createElement("td", {}, [quantity ? `${quantity}${unit ? ` ${unit}` : ""}` : "—"]),
    createElement("td", {}, [formatOrderDate(getOrderValue(order, "orderDate", "createdAt", "created_at"))]),
    createElement("td", {}, [formatOrderDate(getOrderValue(order, "deliveryDate", "expectedDelivery", "deliveredAt"))]),
    createElement("td", {}, [address]),
    createElement("td", { class: `payment-status ${paymentClass}` }, [payment]),
    createElement("td", { class: `order-status ${statusClass}` }, [status]),
    createElement("td", { class: "action-buttons" }, [
      Button({
        title: "Contact",
        id: `contact-${orderId}`,
        events: {
          click: (e: Event) => {
            e.stopPropagation();
            onContact(contact);
          },
        },
        classes: "small-button buttonx",
      }),

      canAccept(order.status)
        ? Button({
            title: "Accept",
            id: `accept-${orderId}`,
            events: {
              click: (e: Event) => {
                e.stopPropagation();
                onAccepted(orderId);
              },
            },
            classes: "small-button buttonx",
          })
        : null,

      canMarkPaid(order.status)
        ? Button({
            title: "Mark Paid",
            id: `markpaid-${orderId}`,
            events: {
              click: (e: Event) => {
                e.stopPropagation();
                onMarkedPaid(orderId);
              },
            },
            classes: "small-button buttonx",
          })
        : null,

      canDeliver(order.status)
        ? Button({
            title: "Delivered",
            id: `deliver-${orderId}`,
            events: {
              click: (e: Event) => {
                e.stopPropagation();
                onDelivered(orderId);
              },
            },
            classes: "small-button buttonx",
          })
        : null,

      canReject(order.status)
        ? Button({
            title: "Reject",
            id: `reject-${orderId}`,
            events: {
              click: (e: Event) => {
                e.stopPropagation();
                onReject(orderId);
              },
            },
            classes: "small-button buttonx",
          })
        : null,
    ].filter(Boolean)),
  ]);
}