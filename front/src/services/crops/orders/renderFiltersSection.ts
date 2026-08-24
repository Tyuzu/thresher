import "../../../../css/filters.css";

import { createElement } from "../../../components/createElement.js";
import Button from "../../../components/base/Button.js";
import { OrderFilters } from "./orderUtils.js";

export function renderFiltersSection(onApplyFilters: (filters: OrderFilters) => void): HTMLElement {
  const cropTypeInput = createElement("input", {
    type: "text",
    id: "filter-crop-type",
    placeholder: "Crop name",
  }) as HTMLInputElement;

  const orderStatusSelect = createElement(
    "select",
    { id: "filter-order-status" },
    [
      { value: "", label: "All" },
      { value: "pending", label: "Pending" },
      { value: "accepted", label: "Accepted" },
      { value: "paid", label: "Paid" },
      { value: "delivered", label: "Delivered" },
      { value: "rejected", label: "Rejected" },
    ].map((opt) =>
      createElement("option", { value: opt.value }, [opt.label])
    )
  ) as HTMLSelectElement;

  const paymentStatusSelect = createElement(
    "select",
    { id: "filter-payment-status" },
    [
      { value: "", label: "All" },
      { value: "paid", label: "Paid" },
      { value: "pending", label: "Pending" },
      { value: "unpaid", label: "Unpaid" },
    ].map((opt) =>
      createElement("option", { value: opt.value }, [opt.label])
    )
  ) as HTMLSelectElement;

  const dateInput = createElement("input", {
    type: "date",
    id: "filter-date",
  }) as HTMLInputElement;

  const applyButton = Button({
    title: "Apply Filters",
    id: "apply-filters-btn",
    events: {
      click: () => {
        const filters: OrderFilters = {
          crop: cropTypeInput.value.trim(),
          status: orderStatusSelect.value,
          payment: paymentStatusSelect.value,
          date: dateInput.value,
        };

        onApplyFilters(filters);
      },
    },
    classes: "primary-button",
  });

  return createElement("div", { class: "filters-section" }, [
    createElement("label", {}, ["Crop:", cropTypeInput]),
    createElement("label", {}, ["Order Status:", orderStatusSelect]),
    createElement("label", {}, ["Payment Status:", paymentStatusSelect]),
    createElement("label", {}, ["Date:", dateInput]),
    applyButton,
  ]);
}