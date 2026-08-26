import { createElement } from "../../components/createElement.js";
import { createTabs } from "../../utils/persistTabs.js";
import { displayOrders } from "../crops/orders/orders.js";
import { displayMyFarm } from "../crops/farm/myFarms.js";
import { getFarmDashboard } from "./api.js";

interface CropItem {
  name?: string;
  quantity?: number;
  unit?: string;
  price?: number;
  discount?: number;
  value?: number;
}

interface DayAvailability {
  enabled?: boolean;
  from?: string;
  to?: string;
}

interface FarmAvailability {
  monday?: DayAvailability;
  tuesday?: DayAvailability;
  wednesday?: DayAvailability;
  thursday?: DayAvailability;
  friday?: DayAvailability;
  saturday?: DayAvailability;
  sunday?: DayAvailability;
  [key: string]: DayAvailability | undefined;
}

interface FarmData {
  name?: string;
  crops?: CropItem[];
  location?: string;
  practice?: string;
  contact?: string;
  owner?: string;
  description?: string;
  availability?: FarmAvailability;
}

interface AlertItem {
  severity?: string;
  message?: string;
}

interface OrderItem {
  orderId?: string | number;
  id?: string | number;
  status?: string;
  total?: number;
}

interface DashboardData {
  inventory?: {
    totalCrops?: number;
    totalQuantity?: number;
    inventoryValue?: number;
    featuredCrops?: number;
    lowStockCount?: number;
    outOfStockCount?: number;
  };
  stats?: {
    healthScore?: number;
  };
  revenue?: {
    monthly?: number;
    lifetime?: number;
  };
  orders?: {
    pending?: number;
    delivered?: number;
    today?: number;
    customers?: number;
    total?: number;
    cancelled?: number;
  };
  alerts?: AlertItem[];
  recommendations?: string[];
  topCrops?: CropItem[];
  recentOrders?: OrderItem[];
}

interface FarmDashResponse {
  success?: boolean;
  message?: string;
  farm?: FarmData;
  dashboard?: DashboardData;
}

export function displayDash(content: HTMLElement, isLoggedIn: boolean): void {
  content.replaceChildren();

  if (!isLoggedIn) {
    content.appendChild(
      createElement("div", { class: "dash-guest" }, [
        createElement("h2", {}, ["Welcome to your Farm Dashboard"]),
        createElement("p", {}, [
          "Log in to view farm performance, inventory, orders, and revenue.",
        ]),
      ])
    );
    return;
  }

  const tabs = [
    { id: "overview", title: "Overview", render: renderOverviewTab },
    { id: "orders", title: "Orders", render: renderOrdersTab },
    { id: "myfarm", title: "My Farm", render: renderMyFarmTab },
  ];

  const activeTabId = localStorage.getItem("dash-active-tab") || "overview";

  const tabUI = createTabs(
    tabs,
    "farmdash-tabs",
    activeTabId,
    (newTabId: string) => {
      localStorage.setItem("dash-active-tab", newTabId);
    }
  );

  content.appendChild(
    createElement("div", { class: "farmdashpage" }, [tabUI])
  );
}

function renderOverviewTab(container: HTMLElement): void {
  container.replaceChildren();

  const loading = createElement("div", { class: "dashboard-loading" }, [
    createElement("p", {}, ["Loading dashboard..."]),
  ]);

  container.appendChild(loading);

  getFarmDashboard()
    .then((response: FarmDashResponse) => {
      container.replaceChildren();

      if (!response?.success || !response?.farm) {
        renderOverviewFallback(
          container,
          response?.message || "Farm not found."
        );
        return;
      }

      const farm = response.farm;
      const dashboard = response.dashboard || {};
      const crops = Array.isArray(farm.crops) ? farm.crops : [];

      container.appendChild(buildStatsSummary(farm, dashboard));
      container.appendChild(buildRevenueSection(dashboard.revenue || {}));
      container.appendChild(buildOrdersSection(dashboard.orders || {}));
      container.appendChild(buildAlertsSection(dashboard.alerts || []));
      container.appendChild(
        buildRecommendationsSection(dashboard.recommendations || [])
      );
      container.appendChild(
        buildTopCropsSection(dashboard.topCrops || [])
      );
      container.appendChild(
        buildRecentOrdersSection(
          Array.isArray(dashboard.recentOrders)
            ? dashboard.recentOrders
            : []
        )
      );
      container.appendChild(buildCropSection(crops));
      container.appendChild(buildFarmExtra(farm));
    })
    .catch((err) => {
      console.error("Dashboard load failed:", err);
      container.replaceChildren();
      renderOverviewFallback(container, "Failed to load dashboard.");
    });
}

function renderOrdersTab(container: HTMLElement): void {
  displayOrders(container);
}

function renderMyFarmTab(container: HTMLElement): void {
  displayMyFarm(container);
}

function buildStatsSummary(farm: FarmData, dashboard: DashboardData): HTMLElement {
  const inventory = dashboard.inventory || {};
  const stats = dashboard.stats || {};

  return createElement("div", { class: "stats-summary" }, [
    createElement("div", { class: "stat-card" }, [
      `Farm: ${farm.name || "Unnamed Farm"}`,
    ]),
    createElement("div", { class: "stat-card" }, [
      `Health Score: ${stats.healthScore ?? 0}%`,
    ]),
    createElement("div", { class: "stat-card" }, [
      `Total Crops: ${inventory.totalCrops ?? 0}`,
    ]),
    createElement("div", { class: "stat-card" }, [
      `Inventory Qty: ${inventory.totalQuantity ?? 0}`,
    ]),
    createElement("div", { class: "stat-card" }, [
      `Inventory Value: ₹${formatMoney(inventory.inventoryValue)}`,
    ]),
    createElement("div", { class: "stat-card" }, [
      `Featured Crops: ${inventory.featuredCrops ?? 0}`,
    ]),
    createElement("div", { class: "stat-card" }, [
      `Low Stock: ${inventory.lowStockCount ?? 0}`,
    ]),
    createElement("div", { class: "stat-card" }, [
      `Out of Stock: ${inventory.outOfStockCount ?? 0}`,
    ]),
  ]);
}

function buildRevenueSection(revenue: DashboardData["revenue"] & {}): HTMLElement {
  return createElement("div", { class: "dashboard-section" }, [
    createElement("h3", {}, ["Revenue"]),
    createElement("div", { class: "stats-summary" }, [
      createElement("div", { class: "stat-card" }, [
        `Monthly Revenue: ₹${formatMoney(revenue?.monthly)}`,
      ]),
      createElement("div", { class: "stat-card" }, [
        `Lifetime Revenue: ₹${formatMoney(revenue?.lifetime)}`,
      ]),
    ]),
  ]);
}

function buildOrdersSection(orders: DashboardData["orders"] & {}): HTMLElement {
  return createElement("div", { class: "dashboard-section" }, [
    createElement("h3", {}, ["Orders"]),
    createElement("div", { class: "stats-summary" }, [
      createElement("div", { class: "stat-card" }, [
        `Pending: ${orders?.pending ?? 0}`,
      ]),
      createElement("div", { class: "stat-card" }, [
        `Delivered: ${orders?.delivered ?? 0}`,
      ]),
      createElement("div", { class: "stat-card" }, [
        `Today's Orders: ${orders?.today ?? 0}`,
      ]),
      createElement("div", { class: "stat-card" }, [
        `Customers: ${orders?.customers ?? 0}`,
      ]),
      createElement("div", { class: "stat-card" }, [
        `Total Orders: ${orders?.total ?? 0}`,
      ]),
      createElement("div", { class: "stat-card" }, [
        `Cancelled: ${orders?.cancelled ?? 0}`,
      ]),
    ]),
  ]);
}

function buildAlertsSection(alerts: AlertItem[]): HTMLElement {
  return createElement("div", { class: "dashboard-section" }, [
    createElement("h3", {}, ["Alerts"]),
    alerts.length === 0
      ? createElement("p", {}, ["No active alerts"])
      : createElement(
        "ul",
        { class: "dashboard-alerts" },
        alerts.map((alert) =>
          createElement("li", { class: `alert-${alert.severity || "info"}` }, [
            createElement("strong", {}, [
              `${(alert.severity || "info").toUpperCase()}: `,
            ]),
            alert.message || "Unknown alert",
          ])
        )
      ),
  ]);
}

function buildRecommendationsSection(recommendations: string[]): HTMLElement {
  return createElement("div", { class: "dashboard-section" }, [
    createElement("h3", {}, ["Recommendations"]),
    recommendations.length === 0
      ? createElement("p", {}, ["No recommendations"])
      : createElement(
        "ul",
        {},
        recommendations.map((item) =>
          createElement("li", {}, [item])
        )
      ),
  ]);
}

function buildTopCropsSection(crops: CropItem[]): HTMLElement {
  return createElement("div", { class: "dashboard-section" }, [
    createElement("h3", {}, ["Top Inventory Value Crops"]),
    crops.length === 0
      ? createElement("p", {}, ["No crop data"])
      : createElement(
        "ul",
        {},
        crops.map((crop) =>
          createElement("li", {}, [
            `${crop.name || "Unnamed Crop"} • ${crop.quantity ?? 0} ${crop.unit || ""} • ₹${formatMoney(crop.value)}`,
          ])
        )
      ),
  ]);
}

function buildRecentOrdersSection(orders: OrderItem[]): HTMLElement {
  return createElement("div", { class: "dashboard-section" }, [
    createElement("h3", {}, ["Recent Orders"]),
    orders.length === 0
      ? createElement("p", {}, ["No recent orders"])
      : createElement(
        "ul",
        {},
        orders.map((order) =>
          createElement("li", {}, [
            `${order.orderId || order.id || "Unknown"} • ${order.status || "Unknown"} • ₹${formatMoney(order.total)}`,
          ])
        )
      ),
  ]);
}

function buildCropSection(crops: CropItem[]): HTMLElement {
  const section = createElement(
    "div",
    { class: "crop-distribution dashboard-section" },
    [createElement("h3", {}, ["Current Inventory"])]
  );

  if (!crops.length) {
    section.appendChild(
      createElement("p", {}, ["No crops listed yet."])
    );
    return section;
  }

  section.appendChild(
    createElement(
      "ul",
      {},
      crops.map((crop) =>
        createElement("li", {}, [
          `${crop.name || "Unnamed Crop"} • ${crop.quantity ?? 0} ${crop.unit || ""} • ₹${formatMoney(crop.price)}/${crop.unit || "unit"} • ${crop.discount ?? 0}% discount`,
        ])
      )
    )
  );

  return section;
}

function buildFarmExtra(farm: FarmData): HTMLElement {
  return createElement("div", { class: "farm-extra dashboard-section" }, [
    createElement("h3", {}, ["Farm Information"]),
    createElement("p", {}, [
      `Location: ${farm.location || "N/A"}`,
    ]),
    createElement("p", {}, [
      `Practice: ${farm.practice || "N/A"}`,
    ]),
    createElement("p", {}, [
      `Contact: ${farm.contact || "N/A"}`,
    ]),
    createElement("p", {}, [
      `Owner: ${farm.owner || "N/A"}`,
    ]),
    createElement("p", {}, [
      `Description: ${farm.description || "N/A"}`,
    ]),
    buildAvailability(farm.availability),
  ]);
}

function buildAvailability(availability?: FarmAvailability): HTMLElement {
  const days: [string, string][] = [
    ["monday", "Monday"],
    ["tuesday", "Tuesday"],
    ["wednesday", "Wednesday"],
    ["thursday", "Thursday"],
    ["friday", "Friday"],
    ["saturday", "Saturday"],
    ["sunday", "Sunday"],
  ];

  const list = createElement("ul", { class: "farm-availability" });
  for (const [key, label] of days) {
    const day = availability?.[key];

    if (!day) {
      continue;
    }

    const text = day.enabled
      ? `${label}: ${day.from || "N/A"} - ${day.to || "N/A"}`
      : `${label}: Closed`;

    list.appendChild(createElement("li", {}, [text]));
  }
  return createElement("div", {}, [
    createElement("h4", {}, ["Availability"]),
    list,
  ]);
}

function renderOverviewFallback(container: HTMLElement, message: string): void {
  container.appendChild(
    createElement("div", { class: "empty-state" }, [
      createElement("h3", {}, ["No Farm Found"]),
      createElement("p", {}, [message]),
      createElement(
        "a",
        {
          href: "/create-farm",
          class: "create-farm-btn",
        },
        ["Create Farm"]
      ),
    ])
  );
}

function formatMoney(value: unknown): string {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0.00";
  }

  return number.toFixed(2);
}