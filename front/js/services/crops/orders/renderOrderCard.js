import { createElement } from "../../../components/createElement";
import Button from "../../../components/base/Button.js";
import {
  capitalize,
  contactBuyer,
  formatOrderDate,
  getOrderStatusClass,
  getPaymentStatusClass,
  getOrderValue,
  normalizeOrderId,
} from "./orderHelpers.js";
import {
  markOrderDelivered,
  markOrderPaid,
  rejectOrder,
  acceptOrder,
} from "./orderUtils.js";

function canAccept(status) {
  return String(status || "").toLowerCase() === "pending";
}

function canMarkPaid(status) {
  return String(status || "").toLowerCase() === "accepted";
}

function canDeliver(status) {
  return String(status || "").toLowerCase() === "paid";
}

function canReject(status) {
  const normalized = String(status || "").toLowerCase();
  return normalized === "pending" || normalized === "accepted";
}

export function renderOrderCard(order, onRefresh) {
  const orderId = normalizeOrderId(order);
  const statusClass = getOrderStatusClass(order.status);
  const paymentClass = getPaymentStatusClass(order.payment);
  const buyerName = getOrderValue(order, "buyer", "name", "customerName") || "-";
  const contact = getOrderValue(order, "contact", "phone", "email") || "-";
  const cropName = getOrderValue(order, "crop", "cropName", "itemName", "productName") || "-";
  const quantity = getOrderValue(order, "qty", "quantity", "requestedQty") ?? "-";
  const unit = getOrderValue(order, "unit", "itemUnit") || "";
  const orderDate = formatOrderDate(getOrderValue(order, "orderDate", "createdAt", "created_at"));
  const deliveryDate = formatOrderDate(getOrderValue(order, "deliveryDate", "expectedDelivery", "deliveredAt"));
  const address = getOrderValue(order, "address", "deliveryAddress", "shippingAddress") || "-";
  const payment = capitalize(getOrderValue(order, "payment", "paymentMethod") || "pending");
  const farmName = getOrderValue(order, "farm", "farmName", "farmid") || "-";

  const handleContact = () => {
    contactBuyer(contact === "-" ? "" : contact);
  };

  const handleAccepted = async () => {
    const success = await acceptOrder(orderId);
    if (success) {
      onRefresh?.();
    }
  };

  const handleMarkedPaid = async () => {
    const success = await markOrderPaid(orderId);
    if (success) {
      onRefresh?.();
    }
  };

  const handleDelivered = async () => {
    const success = await markOrderDelivered(orderId);
    if (success) {
      onRefresh?.();
    }
  };

  const handleReject = async () => {
    const success = await rejectOrder(orderId);
    if (success) {
      onRefresh?.();
    }
  };

  return createElement("div", { class: "order-card" }, [
    createElement("div", { class: "order-header" }, [
      createElement("h3", {}, [`Order #${orderId}`]),
      createElement("span", { class: `status-badge ${statusClass}` }, [
        capitalize(order.status),
      ]),
    ]),

    createElement("div", { class: "order-info" }, [
      createElement("p", {}, [
        createElement("strong", {}, ["Buyer:"]),
        ` ${buyerName}`,
      ]),
      createElement("p", {}, [
        createElement("strong", {}, ["Contact:"]),
        ` ${contact}`,
      ]),
      createElement("p", {}, [
        createElement("strong", {}, ["Farm:"]),
        ` ${farmName}`,
      ]),
      createElement("p", {}, [
        createElement("strong", {}, ["Crop:"]),
        ` ${cropName}`,
      ]),
      createElement("p", {}, [
        createElement("strong", {}, ["Quantity:"]),
        ` ${quantity}${unit ? ` ${unit}` : ""}`.trim(),
      ]),
      createElement("p", {}, [
        createElement("strong", {}, ["Order Date:"]),
        ` ${orderDate}`,
      ]),
      createElement("p", {}, [
        createElement("strong", {}, ["Delivery Date:"]),
        ` ${deliveryDate}`,
      ]),
      createElement("p", {}, [
        createElement("strong", {}, ["Address:"]),
        ` ${address}`,
      ]),
      createElement("p", { class: `payment-status ${paymentClass}` }, [
        createElement("strong", {}, ["Payment:"]),
        ` ${payment}`,
      ]),
    ]),

    createElement("div", { class: "order-actions" }, [
      Button("Contact", `contact-${orderId}`, { click: handleContact }, "secondary-button"),

      canAccept(order.status)
        ? Button("Accept", `accept-${orderId}`, { click: handleAccepted }, "secondary-button")
        : null,

      canMarkPaid(order.status)
        ? Button("Mark Paid", `markpaid-${orderId}`, { click: handleMarkedPaid }, "secondary-button")
        : null,

      canDeliver(order.status)
        ? Button("Delivered", `deliver-${orderId}`, { click: handleDelivered }, "secondary-button")
        : null,

      canReject(order.status)
        ? Button("Reject", `reject-${orderId}`, { click: handleReject }, "secondary-button")
        : null,
    ].filter(Boolean)),
  ]);
}