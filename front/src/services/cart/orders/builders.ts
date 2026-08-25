import {
  getFilteredOrders,
  toggleExpanded,
  getOrderProducts,
  getOrderSummaryMeta,
  formatDate,
  formatINR,
  capitalize,
  downloadReceipt,
} from "./orderutils.js";
import { createElement } from "../../../components/createElement.js";
import { Button } from "../../../components/base/Button.js";
import { Order, OrderItem, OrderPageState } from "./types.js";

const PAGE_SIZE = 5;

type RerenderCallback = () => void;

/* ───────────────── Page ───────────────── */

export function buildOrdersPage(state: OrderPageState, rerender: RerenderCallback): HTMLElement {
  const filteredOrders = getFilteredOrders(state.orders, state.filters);
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  if (state.currentPage > totalPages) {
    state.currentPage = totalPages;
  }

  const pagedOrders = filteredOrders.slice(
    (state.currentPage - 1) * PAGE_SIZE,
    state.currentPage * PAGE_SIZE
  );

  const isMobile = window.innerWidth <= 768;

  const sectionChildren: HTMLElement[] = [
    createElement("h2", {}, ["My Orders"]),
    buildUserOrderFilters(state, rerender),
    buildOrdersSummary(filteredOrders.length, state.orders.length, state.currentPage, totalPages),
  ];

  if (isMobile) {
    sectionChildren.push(buildMobileOrdersList(pagedOrders, state, rerender));
  } else {
    sectionChildren.push(buildDesktopOrdersTable(pagedOrders, state, rerender));
  }

  sectionChildren.push(buildPaginationControls(state, filteredOrders.length, totalPages, rerender));

  return createElement("section", { class: "user-orders-page" }, sectionChildren);
}

/* ───────────────── Filters ───────────────── */

export function buildUserOrderFilters(state: OrderPageState, rerender: RerenderCallback): HTMLElement {
  return createElement("div", { class: "filters" }, [
    buildLabeledSelect(
      "Status",
      [
        { value: "", label: "All" },
        { value: "pending", label: "Pending" },
        { value: "accepted", label: "Accepted" },
        { value: "paid", label: "Paid" },
        { value: "delivered", label: "Delivered" },
        { value: "rejected", label: "Rejected" },
        { value: "active", label: "Active" },
        { value: "closed", label: "Closed" },
      ],
      state.filters.status,
      (value: string) => {
        state.filters.status = value;
        state.currentPage = 1;
        rerender();
      }
    ),
    createElement("label", {}, [
      "Date: ",
      createElement("input", {
        type: "date",
        value: state.filters.date || "",
        onchange: (e: Event) => {
          const target = e.target as HTMLInputElement;
          state.filters.date = target.value;
          state.currentPage = 1;
          rerender();
        },
      }),
    ]),
    Button({
      title: "Filter",
      events: {
        click: () => {
          state.currentPage = 1;
          rerender();
        },
      },
    }),
    Button({
      title: "Reset",
      events: {
        click: () => {
          state.filters.status = "";
          state.filters.date = "";
          state.currentPage = 1;
          rerender();
        },
      },
    }),
  ]);
}

export function buildOrdersSummary(
  filteredCount: number,
  totalCount: number,
  currentPage: number,
  totalPages: number
): HTMLElement {
  return createElement("p", { class: "orders-summary" }, [
    `Showing ${filteredCount} of ${totalCount} order(s) · Page ${currentPage} of ${totalPages}`,
  ]);
}

/* ───────────────── Desktop Table ───────────────── */

function buildDesktopOrdersTable(
  orders: Order[],
  state: OrderPageState,
  rerender: RerenderCallback
): HTMLElement {
  const headers = ["", "Order ID", "Date", "Type", "Total", "Status", "Payment", "Actions"];

  return createElement("table", { class: "orders-table" }, [
    createElement("thead", {}, [
      createElement(
        "tr",
        {},
        headers.map((h) => createElement("th", {}, [h]))
      ),
    ]),
    createElement(
      "tbody",
      {},
      orders.length
        ? orders.flatMap((order) => buildExpandableOrderRows(order, state, rerender))
        : [
            createElement("tr", {}, [
              createElement("td", { colspan: "8" }, ["No orders found."]),
            ]),
          ]
    ),
  ]);
}

function buildExpandableOrderRows(
  order: Order,
  state: OrderPageState,
  rerender: RerenderCallback
): HTMLElement[] {
  const expanded = state.expandedOrders.has(order.orderId);
  const products = getOrderProducts(order) || [];
  const meta = getOrderSummaryMeta(order);

  const addressInfo = meta.address || "N/A";
  const farmInfo = meta.farmId || "N/A";
  const approvedList =
    Array.isArray(meta.approvedBy) && meta.approvedBy.length ? meta.approvedBy.join(", ") : "None";

  const summaryRow = createElement("tr", { class: "order-summary-row" }, [
    createElement("td", {}, [
      Button({
        title: expanded ? "−" : "+",
        classes: "toggle-btn",
        events: {
          click: () => {
            toggleExpanded(state, order.orderId);
            rerender();
          },
        },
      }),
    ]),
    createElement("td", {}, [String(meta.orderId || order.orderId)]),
    createElement("td", {}, [formatDate(order.createdAt)]),
    createElement("td", {}, [capitalize(meta.orderType || "N/A")]),
    createElement("td", {}, [formatINR(order.total || 0, true)]),
    createElement("td", {}, [capitalize(meta.status || "N/A")]),
    createElement("td", {}, [capitalize(meta.payment || "N/A")]),
    createElement("td", {}, [
      Button({
        title: "Receipt",
        events: { click: () => downloadReceipt(order) },
      }),
    ]),
  ]);

  const detailRow = createElement("tr", { class: "order-detail-row" }, [
    createElement("td", { colspan: "8" }, [
      expanded
        ? createElement("div", { class: "order-detail-grid" }, [
            createElement("p", {}, [`Payment: ${capitalize(meta.payment || "N/A")}`]),
            createElement("p", {}, [`Address: ${addressInfo}`]),
            createElement("p", {}, [`Farm: ${farmInfo}`]),
            createElement("p", {}, [`Approved By: ${approvedList}`]),
            buildOrderItemsTable(products),
          ])
        : createElement("div", { style: "display: none;" }, []),
    ]),
  ]);

  return [summaryRow, detailRow];
}

function buildOrderItemsTable(products: OrderItem[]): HTMLElement {
  return createElement("table", { class: "order-items-table" }, [
    createElement("thead", {}, [
      createElement(
        "tr",
        {},
        ["Farm", "Item", "Qty", "Item Price"].map((h) => createElement("th", {}, [h]))
      ),
    ]),
    createElement(
      "tbody",
      {},
      products.length
        ? products.map((item) =>
            createElement("tr", {}, [
              createElement("td", {}, [item.entityName || "Unknown Entity"]),
              createElement("td", {}, [item.itemName || "N/A"]),
              createElement("td", {}, [String(item.quantity || 0)]),
              createElement("td", {}, [formatINR(item.price || 0, true)]),
            ])
          )
        : [
            createElement("tr", {}, [
              createElement("td", { colspan: "4" }, ["No items found."]),
            ]),
          ]
    ),
  ]);
}

/* ───────────────── Mobile Cards ───────────────── */

function buildMobileOrdersList(
  orders: Order[],
  state: OrderPageState,
  rerender: RerenderCallback
): HTMLElement {
  return createElement(
    "div",
    { class: "orders-cards" },
    orders.length
      ? orders.map((order) => buildExpandableOrderCard(order, state, rerender))
      : [createElement("p", {}, ["No orders found."])]
  );
}

function buildExpandableOrderCard(
  order: Order,
  state: OrderPageState,
  rerender: RerenderCallback
): HTMLElement {
  const expanded = state.expandedOrders.has(order.orderId);
  const products = getOrderProducts(order) || [];
  const meta = getOrderSummaryMeta(order);

  const addressInfo = meta.address || "N/A";
  const approvedList =
    Array.isArray(meta.approvedBy) && meta.approvedBy.length ? meta.approvedBy.join(", ") : "None";

  return createElement("div", { class: "order-card" }, [
    createElement("div", { class: "order-card-header" }, [
      createElement("p", {}, [`Order ID: ${meta.orderId || order.orderId}`]),
      Button({
        title: expanded ? "Collapse" : "Expand",
        events: {
          click: () => {
            toggleExpanded(state, order.orderId);
            rerender();
          },
        },
      }),
    ]),
    createElement("p", {}, [`Date: ${formatDate(order.createdAt)}`]),
    createElement("p", {}, [`Type: ${capitalize(meta.orderType || "N/A")}`]),
    createElement("p", {}, [`Status: ${capitalize(meta.status || "N/A")}`]),
    createElement("p", {}, [`Payment: ${capitalize(meta.payment || "N/A")}`]),
    createElement("p", {}, [`Address: ${addressInfo}`]),
    createElement("p", {}, [`Total: ${formatINR(order.total || 0, true)}`]),
    expanded
      ? createElement("div", { class: "order-card-items" }, [
          createElement("p", {}, [`Farm ID: ${meta.farmId || "N/A"}`]),
          createElement("p", {}, [`Approved By: ${approvedList}`]),
          ...products.map((item) =>
            createElement("div", { class: "order-card-item" }, [
              createElement("p", {}, [`Farm: ${item.entityName || "Unknown"}`]),
              createElement("p", {}, [`Item: ${item.itemName || "N/A"}`]),
              createElement("p", {}, [`Qty: ${item.quantity || 0}`]),
              createElement("p", {}, [`Item Price: ${formatINR(item.price || 0, true)}`]),
            ])
          ),
        ])
      : createElement("div", { style: "display: none;" }, []),
    Button({
      title: "Receipt",
      classes: "btn-receipt",
      events: { click: () => downloadReceipt(order) },
    }),
  ]);
}

/* ───────────────── Pagination ───────────────── */

function buildPaginationControls(
  state: OrderPageState,
  totalOrders: number,
  totalPages: number,
  rerender: RerenderCallback
): HTMLElement {
  const prevBtn = Button({
    title: "Prev",
    events: {
      click: () => {
        if (state.currentPage > 1) {
          state.currentPage -= 1;
          rerender();
        }
      },
    },
  });
  if (state.currentPage <= 1) {
    prevBtn.setAttribute("disabled", "true");
  }

  const nextBtn = Button({
    title: "Next",
    events: {
      click: () => {
        if (state.currentPage < totalPages) {
          state.currentPage += 1;
          rerender();
        }
      },
    },
  });
  if (state.currentPage >= totalPages) {
    nextBtn.setAttribute("disabled", "true");
  }

  return createElement("div", { class: "pagination" }, [
    prevBtn,
    createElement("span", {}, [`Page ${state.currentPage} of ${totalPages} · ${totalOrders} order(s)`]),
    nextBtn,
  ]);
}

/* ───────────────── Utilities ───────────────── */

interface SelectOption {
  value: string;
  label: string;
}

function buildLabeledSelect(
  labelText: string,
  options: SelectOption[],
  currentValue: string,
  onChange: (value: string) => void
): HTMLElement {
  return createElement("label", {}, [
    `${labelText}: `,
    createElement(
      "select",
      {
        onchange: (e: Event) => {
          const target = e.target as HTMLSelectElement;
          onChange(target.value);
        },
      },
      options.map((o) => {
        const optionAttrs: Record<string, string> = { value: o.value };
        if (String(o.value) === String(currentValue)) {
          optionAttrs.selected = "selected";
        }
        return createElement("option", optionAttrs, [o.label]);
      })
    ),
  ]);
}