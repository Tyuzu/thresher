import { createElement } from "../../../components/createElement.js";
import Button from "../../../components/base/Button.js";

type EventHandler = (event: Event) => void;

export function renderBulkActionsSection(
  onAccept: EventHandler,
  onReject: EventHandler,
  onMarkDelivered: EventHandler
): HTMLElement {
  const acceptBtn = Button({
    title: "Accept Selected",
    id: "bulk-accept-btn",
    events: { click: onAccept },
    classes: "success-button buttonx",
  });

  const rejectBtn = Button({
    title: "Reject Selected",
    id: "bulk-reject-btn",
    events: { click: onReject },
    classes: "danger-button buttonx",
  });

  const deliveredBtn = Button({
    title: "Mark as Delivered",
    id: "bulk-delivered-btn",
    events: { click: onMarkDelivered },
    classes: "secondary-button buttonx",
  });

  return createElement("div", { class: "bulk-actions-section" }, [
    acceptBtn,
    rejectBtn,
    deliveredBtn,
  ]);
}