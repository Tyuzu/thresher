import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import Datex from "../../components/base/Datex.js";
import Notify from "../../components/ui/Notify.js";
import { navigate } from "../../routes/navigate.js";
import { createMainLayout } from "../../components/layout/mainLayout.js";
import { createAsideContent } from "../../components/layout/asideLayout.js";
import { adspace } from "../../services/ads/newads.js";
import { fetchAllDeliveries, claimDelivery, cancelDelivery } from "../../services/deliveries/deliveriesApi.js";

// --- INTERFACES & TYPES ---
interface DeliveryLocation {
  address?: string;
  lat?: number;
  lng?: number;
  [key: string]: any;
}

interface DeliveryItem {
  deliveryid?: string | number;
  id?: string | number;
  status?: string;
  payout?: number | string;
  distance_km?: number;
  pickup_loc?: DeliveryLocation;
  dropoff_loc?: DeliveryLocation;
  package_weight?: number | string;
  vehicle_type?: string;
  is_fragile?: boolean;
  expires_at?: string | number;
  created_at?: string | number;
  [key: string]: any;
}

interface DisplayDeliveriesOptions {
  userRole?: string;
  [key: string]: any;
}

export async function displayDeliveries(
  isLoggedIn: boolean | HTMLElement | null,
  container?: HTMLElement | null,
  options: DisplayDeliveriesOptions = {}
): Promise<void> {
  const contentContainer = (container && typeof container === "object" && container.nodeType)
    ? container
    : ((isLoggedIn && typeof isLoggedIn === "object" && (isLoggedIn as HTMLElement).nodeType) ? (isLoggedIn as HTMLElement) : null);

  if (typeof isLoggedIn === "boolean" && !isLoggedIn && !container) {
    return;
  }

  if (!contentContainer) {
    console.error("displayDeliveries: Missing DOM container element.");
    return;
  }

  contentContainer.replaceChildren();
  const PAGE_NAME = "deliveries";

  // --- STATE ---
  let rawDeliveries: DeliveryItem[] = [];
  let filteredDeliveries: DeliveryItem[] = [];
  let currentViewMode: "grid" | "list" | "map" = "grid";
  let userRole = options.userRole || localStorage.getItem("user_role") || "courier"; // "courier" | "sender"
  let currentPage = 1;
  const PAGE_SIZE = 6;
  let searchQuery = "";
  let statusFilter = "ALL";
  let sortBy = "newest";

  // --- SIDEBAR ACTIONS ---
  const actionButtons: HTMLElement[] = [];
  if (typeof isLoggedIn === "boolean" && isLoggedIn) {
    actionButtons.push(
      Button({
        title: "Create Delivery",
        id: "btn-crt-del",
        events: { click: () => navigate("/delivery/create") },
        classes: "buttonx primary"
      })
    );
    actionButtons.push(
      Button({
        title: "Register as Driver",
        id: "btn-reg-drv",
        events: { click: () => navigate("/delivery/addDriver") },
        classes: "buttonx primary"
      })
    );
  }

  // Role Switcher Toggle
  const roleToggleBtn = Button({
    title: `Role: ${userRole.toUpperCase()}`,
    id: "btn-toggle-role",
    events: {
      click: () => {
        userRole = userRole === "courier" ? "sender" : "courier";
        roleToggleBtn.textContent = `Role: ${userRole.toUpperCase()}`;
        roleToggleBtn.setAttribute("aria-label", `Current role: ${userRole}. Click to toggle.`);
        renderList();
      }
    },
    classes: "buttonx secondary"
  });
  roleToggleBtn.setAttribute("aria-label", `Current role: ${userRole}. Click to toggle.`);
  actionButtons.push(roleToggleBtn);

  const actionsWrapper = createElement("div", { class: "aside-actions-group" }, actionButtons);

  // Sidebar Ad Placement
  const sidebarAd = adspace("aside", PAGE_NAME, {
    layout: "vertical",
    width: 300,
    height: 250,
    refreshInterval: 30000
  });

  const asideContent = createAsideContent({
    title: "Operations",
    sections: [
      {
        title: "Actions",
        content: actionsWrapper,
        className: "aside-actions-section"
      },
      {
        content: sidebarAd,
        className: "aside-ad-section"
      }
    ],
    showAd: false, // Handled directly via custom section
    page: PAGE_NAME
  });

  // --- TOP HEADER & CONTROLS ---
  const refreshBtn = createElement("button", {
    type: "button",
    class: "btn-refresh",
    "aria-label": "Refresh deliveries list",
    events: {
      click: async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = "Refreshing...";
        refreshBtn.setAttribute("aria-busy", "true");
        await loadDeliveries();
        refreshBtn.disabled = false;
        refreshBtn.textContent = "🔄 Refresh";
        refreshBtn.removeAttribute("aria-busy");
      }
    }
  }, ["🔄 Refresh"]);

  const headerContainer = createElement("header", { class: "deliveries-header" }, [
    createElement("div", { class: "deliveries-header-row" }, [
      createElement("h1", {}, ["Deliveries & Shipments"]),
      refreshBtn
    ]),
    adspace("inbody", PAGE_NAME, {
      layout: "horizontal", width: 728, height: 90, refreshInterval: 45000
    })
  ]);

  // --- FILTER, SORT & SEARCH BAR (FORM / TOOLBAR) ---
  const searchInput = createElement("input", {
    type: "search",
    id: "delivery-search",
    placeholder: "Search address, package or ID...",
    class: "delivery-search-input",
    "aria-label": "Search shipments",
    events: {
      input: (e: Event) => {
        searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
        applyFiltersAndRender();
      }
    }
  });

  const statusSelect = createElement("select", {
    id: "delivery-status-filter",
    class: "delivery-filter-select",
    "aria-label": "Filter by status",
    events: {
      change: (e: Event) => {
        statusFilter = (e.target as HTMLSelectElement).value;
        applyFiltersAndRender();
      }
    }
  }, [
    createElement("option", { value: "ALL" }, ["All Statuses"]),
    createElement("option", { value: "AVAILABLE" }, ["Available"]),
    createElement("option", { value: "CLAIMED" }, ["Claimed"]),
    createElement("option", { value: "IN_TRANSIT" }, ["In Transit"]),
    createElement("option", { value: "DELIVERED" }, ["Delivered"]),
    createElement("option", { value: "CANCELLED" }, ["Cancelled"])
  ]);

  const sortSelect = createElement("select", {
    id: "delivery-sort",
    class: "delivery-sort-select",
    "aria-label": "Sort deliveries",
    events: {
      change: (e: Event) => {
        sortBy = (e.target as HTMLSelectElement).value;
        applyFiltersAndRender();
      }
    }
  }, [
    createElement("option", { value: "newest" }, ["Newest First"]),
    createElement("option", { value: "payout" }, ["Highest Payout"]),
    createElement("option", { value: "expiry" }, ["Expiring Soon"])
  ]);

  // Grid vs List vs Map View Selector
  const btnGridMode = createElement("button", {
    type: "button",
    class: "btn-view-toggle active",
    "aria-pressed": "true",
    events: { click: (e: Event) => setViewMode("grid", e.currentTarget as HTMLElement) }
  }, ["Grid"]);

  const btnListMode = createElement("button", {
    type: "button",
    class: "btn-view-toggle",
    "aria-pressed": "false",
    events: { click: (e: Event) => setViewMode("list", e.currentTarget as HTMLElement) }
  }, ["List"]);

  const btnMapMode = createElement("button", {
    type: "button",
    class: "btn-view-toggle",
    "aria-pressed": "false",
    events: { click: (e: Event) => setViewMode("map", e.currentTarget as HTMLElement) }
  }, ["Map"]);

  const viewToggleGroup = createElement("div", {
    class: "view-toggle-group",
    role: "group",
    "aria-label": "View display mode toggle"
  }, [btnGridMode, btnListMode, btnMapMode]);

  const toolbar = createElement("form", {
    class: "deliveries-toolbar",
    role: "search",
    "aria-label": "Filter and search deliveries",
    events: {
      submit: (e: Event) => e.preventDefault()
    }
  }, [
    searchInput,
    statusSelect,
    sortSelect,
    viewToggleGroup
  ]);

  const mainHeader = [headerContainer, toolbar];

  // --- LAYOUT SETUP ---
  const layout = createMainLayout({
    mainContent: mainHeader,
    asideContent,
    pageClass: "deliveries-page"
  });

  contentContainer.append(layout);
  const mainElement = layout.querySelector("main") || layout.querySelector(".layout-main");

  if (!mainElement) {
    console.error("displayDeliveries: Main layout container element missing.");
    return;
  }

  const listContainer = createElement("section", {
    class: "deliveries-list-container",
    "aria-live": "polite",
    "aria-label": "Shipments List"
  });

  mainElement.append(listContainer);

  // --- VIEW MODE TOGGLE HELPER ---
  function setViewMode(mode: "grid" | "list" | "map", btnElement: HTMLElement) {
    currentViewMode = mode;
    const buttons = viewToggleGroup.querySelectorAll(".btn-view-toggle");
    buttons.forEach((btn) => {
      btn.classList.remove("active");
      btn.setAttribute("aria-pressed", "false");
    });

    if (btnElement) {
      btnElement.classList.add("active");
      btnElement.setAttribute("aria-pressed", "true");
    }
    renderList();
  }

  // --- FETCH DELIVERIES ---
  async function loadDeliveries() {
    listContainer.replaceChildren(
      createElement("div", { class: "deliveries-loading", role: "status" }, ["Loading shipments..."])
    );
    try {
      const resp: any = await fetchAllDeliveries();
      rawDeliveries = Array.isArray(resp) ? resp : resp?.data || resp?.deliveries || [];
      applyFiltersAndRender();
    } catch (err: any) {
      listContainer.replaceChildren(
        createElement("div", { class: "deliveries-error", role: "alert" }, [err?.message || "Failed to load deliveries."])
      );
    }
  }

  // --- FILTERING & SORTING LOGIC ---
  function applyFiltersAndRender() {
    currentPage = 1;
    filteredDeliveries = rawDeliveries.filter((item) => {
      const matchesStatus = statusFilter === "ALL" || (item.status || "AVAILABLE").toUpperCase() === statusFilter;
      const id = String(item.deliveryid ?? item.id ?? "").toLowerCase();
      const pickup = (item.pickup_loc?.address || "").toLowerCase();
      const dropoff = (item.dropoff_loc?.address || "").toLowerCase();

      const matchesSearch = !searchQuery || id.includes(searchQuery) || pickup.includes(searchQuery) || dropoff.includes(searchQuery);
      return matchesStatus && matchesSearch;
    });

    // Sorting
    filteredDeliveries.sort((a, b) => {
      if (sortBy === "payout") return Number(b.payout || 0) - Number(a.payout || 0);
      if (sortBy === "expiry") return new Date(a.expires_at || Date.now()).getTime() - new Date(b.expires_at || Date.now()).getTime();
      return new Date(b.created_at || Date.now()).getTime() - new Date(a.created_at || Date.now()).getTime();
    });

    renderList();
  }

  // --- RENDER MAIN CONTENT ---
  function renderList() {
    listContainer.replaceChildren();

    if (!filteredDeliveries.length) {
      listContainer.append(
        createElement("div", { class: "deliveries-empty", role: "status" }, ["No matching deliveries found."])
      );
      return;
    }

    // Map View Handler
    if (currentViewMode === "map") {
      const mapPlaceholder = createElement("div", {
        class: "deliveries-map-view",
        role: "region",
        "aria-label": "Deliveries map view"
      }, [
        createElement("p", {}, [`Interactive Map Mode (${filteredDeliveries.length} Pins loaded)`])
      ]);
      listContainer.append(mapPlaceholder);
      return;
    }

    // Pagination / Load More
    const paginatedItems = filteredDeliveries.slice(0, currentPage * PAGE_SIZE);
    const gridOrListClass = currentViewMode === "grid" ? "deliveries-grid" : "deliveries-list-view";

    const contentBox = createElement("div", {
      class: gridOrListClass,
      role: "feed",
      "aria-label": "Shipment listings"
    });

    paginatedItems.forEach((item, idx) => {
      contentBox.append(createDeliveryCard(item, userRole, renderList));

      // Inject in-list ad after every 5th item
      if ((idx + 1) % 5 === 0) {
        contentBox.append(
          adspace("inlist", PAGE_NAME, { layout: "horizontal", width: "100%", height: 120 })
        );
      }
    });

    listContainer.append(contentBox);

    // "Load More" controls
    if (paginatedItems.length < filteredDeliveries.length) {
      const remainingCount = filteredDeliveries.length - paginatedItems.length;
      const loadMoreBtn = Button({
        title: `Load More (${remainingCount} remaining)`,
        id: "btn-load-more",
        events: {
          click: () => {
            currentPage++;
            renderList();
          }
        },
        classes: "buttonx secondary btn-load-more"
      });
      loadMoreBtn.setAttribute("aria-label", `Load ${remainingCount} more deliveries`);

      const navContainer = createElement("nav", { class: "pagination-container", "aria-label": "Pagination Navigation" }, [loadMoreBtn]);
      listContainer.append(navContainer);
    }
  }

  // Execute Initial Load
  await loadDeliveries();
}

// ---------- CARD BUILDER ----------
function createDeliveryCard(
  item: DeliveryItem,
  userRole: string,
  onRenderList: () => void
): HTMLElement {
  const deliveryId = item.deliveryid ?? item.id ?? "N/A";
  const status = (item.status || "AVAILABLE").toUpperCase();
  const payout = item.payout ? `$${Number(item.payout).toFixed(2)}` : "$15.00";

  // Distance & Estimated Time Calculation
  const distance = item.distance_km || calculateDistance(item.pickup_loc, item.dropoff_loc);
  const estTimeMinutes = Math.round((distance / 25) * 60) + 10;

  // Package Attributes Badges
  const badgesList = createElement("ul", { class: "badge-group", "aria-label": "Package Attributes" }, [
    createElement("li", {}, [
      createElement("span", { class: "badge badge-weight" }, [
        item.package_weight ? `${item.package_weight} kg` : "< 5 kg"
      ])
    ]),
    createElement("li", {}, [
      createElement("span", { class: "badge badge-vehicle" }, [
        item.vehicle_type || "Car / Bike"
      ])
    ]),
    item.is_fragile
      ? createElement("li", {}, [createElement("span", { class: "badge badge-fragile" }, ["Fragile"])])
      : null
  ].filter(Boolean));

  // Expiry / Timeout Countdown
  const expiryContainer = createElement("div", { class: "expiry-countdown", role: "timer", "aria-live": "off" });
  if (status === "AVAILABLE") {
    const expiresAt = item.expires_at ? new Date(item.expires_at).getTime() : Date.now() + 45 * 60 * 1000;
    startCountdown(expiresAt, expiryContainer);
  }

  // Role-Based Views & Actions
  const cardActions = createElement("footer", { class: "delivery-card-actions" });

  if (userRole === "courier" && status === "AVAILABLE") {
    const claimBtn = Button({
      title: `Claim (${payout})`,
      events: {
        click: async (e: MouseEvent) => {
          e.stopPropagation();
          try {
            await claimDelivery(deliveryId);
            Notify("Delivery claimed successfully!", { type: "success" });
            item.status = "CLAIMED";
            navigate(`/delivery/${deliveryId}`);
          } catch (err: any) {
            Notify(err?.message || "Failed to claim delivery.", { type: "error" });
          }
        }
      },
      classes: "btn-primary"
    });
    claimBtn.setAttribute("aria-label", `Claim delivery ${deliveryId} for ${payout}`);
    cardActions.append(claimBtn);
  } else if (userRole === "sender" && (status === "CREATED" || status === "AVAILABLE")) {
    const cancelBtn = Button({
      title: "Cancel Order",
      events: {
        click: async (e: MouseEvent) => {
          e.stopPropagation();
          try {
            await cancelDelivery(deliveryId);
            Notify("Delivery request cancelled.", { type: "info" });
            item.status = "CANCELLED";
            if (onRenderList) onRenderList();
          } catch (err: any) {
            Notify(err?.message || "Failed to cancel order.", { type: "error" });
          }
        }
      },
      classes: "btn-secondary"
    });
    cancelBtn.setAttribute("aria-label", `Cancel delivery order ${deliveryId}`);
    cardActions.append(cancelBtn);
  }

  // View Details default link button
  const detailsBtn = Button({
    title: "Details",
    events: { click: () => navigate(`/delivery/${deliveryId}`) },
    classes: "btn-secondary"
  });
  detailsBtn.setAttribute("aria-label", `View details for delivery ${deliveryId}`);
  cardActions.append(detailsBtn);

  const createdAtDate = item.created_at ? new Date(item.created_at) : new Date();

  return createElement("article", {
    class: "delivery-card",
    "aria-labelledby": `delivery-title-${deliveryId}`
  }, [
    createElement("header", { class: "card-header" }, [
      createElement("h2", { id: `delivery-title-${deliveryId}`, class: "card-title" }, [`ID: ${deliveryId}`]),
      createElement("span", { class: `status-badge status-${status.toLowerCase()}` }, [status])
    ]),
    badgesList,
    createElement("div", { class: "card-body" }, [
      createElement("dl", { class: "delivery-details-list" }, [
        createElement("div", { class: "detail-item" }, [
          createElement("dt", {}, ["Pickup:"]),
          createElement("dd", {}, [
            createElement("address", { class: "address-inline" }, [item.pickup_loc?.address || "N/A"])
          ])
        ]),
        createElement("div", { class: "detail-item" }, [
          createElement("dt", {}, ["Dropoff:"]),
          createElement("dd", {}, [
            createElement("address", { class: "address-inline" }, [item.dropoff_loc?.address || "N/A"])
          ])
        ]),
        createElement("div", { class: "detail-item" }, [
          createElement("dt", {}, ["Distance:"]),
          createElement("dd", {}, [`${distance} km (~${estTimeMinutes} mins)`])
        ]),
        createElement("div", { class: "detail-item" }, [
          createElement("dt", {}, ["Created:"]),
          createElement("dd", {}, [
            createElement("time", { datetime: createdAtDate.toISOString() }, [
              Datex(item.created_at || Date.now())
            ])
          ])
        ])
      ]),
      expiryContainer
    ]),
    cardActions
  ]);
}

// Countdown timer helper
function startCountdown(targetTimestamp: number, element: HTMLElement) {
  function update() {
    const diff = targetTimestamp - Date.now();
    if (diff <= 0) {
      element.replaceChildren(
        createElement("time", { class: "expired-time" }, ["Expired"])
      );
      return;
    }
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    const isoDuration = `PT${mins}M${secs}S`;

    element.replaceChildren(
      "Expires in: ",
      createElement("time", { datetime: isoDuration }, [`${mins}m ${secs}s`])
    );
  }
  update();
  setInterval(update, 1000);
}

// Distance helper calculation (Haversine Formula)
function calculateDistance(locA?: DeliveryLocation, locB?: DeliveryLocation): number {
  if (!locA?.lat || !locB?.lat) return 4.5;
  const R = 6371;
  const dLat = (locB.lat - locA.lat) * (Math.PI / 180);
  const dLng = (locB.lng! - locA.lng!) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(locA.lat * (Math.PI / 180)) * Math.cos(locB.lat * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const Deliveries = displayDeliveries;
export default displayDeliveries;