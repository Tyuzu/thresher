import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import Datex from "../../components/base/Datex.js";
import Notify from "../../components/ui/Notify.mjs";
import { navigate } from "../../routes/index.js";
import { createMainLayout } from "../../components/layout/mainLayout.js";
import { createAsideContent } from "../../components/layout/asideLayout.js";
import { adspace } from "../../services/ads/newads.js";
import { fetchAllDeliveries, claimDelivery, cancelDelivery } from "../../services/deliveries/deliveriesApi.js";

export async function displayDeliveries(isLoggedIn, container, options = {}) {
  const contentContainer = (container && typeof container === "object" && container.nodeType)
    ? container
    : ((isLoggedIn && typeof isLoggedIn === "object" && isLoggedIn.nodeType) ? isLoggedIn : null);

  if (!contentContainer) {
    console.error("displayDeliveries: Missing DOM container element.");
    return;
  }

  contentContainer.replaceChildren();
  const PAGE_NAME = "deliveries";

  // --- STATE ---
  let rawDeliveries = [];
  let filteredDeliveries = [];
  let currentViewMode = "grid"; // "grid" | "list" | "map"
  let userRole = options.userRole || localStorage.getItem("user_role") || "courier"; // "courier" | "sender"
  let currentPage = 1;
  const PAGE_SIZE = 6;
  let searchQuery = "";
  let statusFilter = "ALL";
  let sortBy = "newest";

  // --- SIDEBAR & ACTIONS ---
  const asideChildren = [];
  if (isLoggedIn) {
    asideChildren.push(
      Button("Create Delivery", "btn-crt-del", { click: () => navigate("/delivery/create") }, "buttonx primary")
    );
    asideChildren.push(
      Button("Register as Driver", "btn-reg-drv", { click: () => navigate("/delivery/addDriver") }, "buttonx primary")
    );
  }

  // Role Switcher Toggle (Feature 0)
  const roleToggleBtn = Button(
    `Role: ${userRole.toUpperCase()}`,
    "btn-toggle-role",
    {
      click: () => {
        userRole = userRole === "courier" ? "sender" : "courier";
        roleToggleBtn.textContent = `Role: ${userRole.toUpperCase()}`;
        renderList();
      }
    },
    "buttonx secondary"
  );
  asideChildren.push(roleToggleBtn);

  // Sidebar Ad Placement
  asideChildren.push(
    adspace("aside", PAGE_NAME, { width: 300, height: 250, refreshInterval: 30000 })
  );

  const asideContent = createAsideContent({
    title: "Operations",
    children: asideChildren,
    showAd: false
  });

  // --- TOP HEADER CONTROLS ---
  // Feature 2: Manual Refresh Button
  const refreshBtn = createElement("button", {
    class: "btn-refresh",
    events: {
      click: async () => {
        refreshBtn.disabled = true;
        refreshBtn.textContent = "Refreshing...";
        await loadDeliveries();
        refreshBtn.disabled = false;
        refreshBtn.textContent = "🔄 Refresh";
      }
    }
  }, ["🔄 Refresh"]);

  const mainHeader = [
    createElement("div", { class: "deliveries-header-row" }, [
      createElement("h1", {}, ["Deliveries & Shipments"]),
      refreshBtn
    ]),
    adspace("inbody", PAGE_NAME, { width: 728, height: 90, refreshInterval: 45000 })
  ];

  // --- FEATURE 7: FILTER, SORT & SEARCH BAR ---
  const searchInput = createElement("input", {
    type: "text",
    placeholder: "Search address, package or ID...",
    class: "delivery-search-input",
    events: {
      input: (e) => {
        searchQuery = e.target.value.toLowerCase();
        applyFiltersAndRender();
      }
    }
  });

  const statusSelect = createElement("select", {
    class: "delivery-filter-select",
    events: {
      change: (e) => {
        statusFilter = e.target.value;
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
    class: "delivery-sort-select",
    events: {
      change: (e) => {
        sortBy = e.target.value;
        applyFiltersAndRender();
      }
    }
  }, [
    createElement("option", { value: "newest" }, ["Newest First"]),
    createElement("option", { value: "payout" }, ["Highest Payout"]),
    createElement("option", { value: "expiry" }, ["Expiring Soon"])
  ]);

  // Feature 1: Grid vs List vs Map View Selector
  const viewToggleContainer = createElement("div", { class: "view-toggle-group" }, [
    createElement("button", {
      class: "btn-view-toggle active",
      events: { click: (e) => setViewMode("grid", e.target) }
    }, ["Grid"]),
    createElement("button", {
      class: "btn-view-toggle",
      events: { click: (e) => setViewMode("list", e.target) }
    }, ["List"]),
    createElement("button", {
      class: "btn-view-toggle",
      events: { click: (e) => setViewMode("map", e.target) }
    }, ["Map"])
  ]);

  const toolbar = createElement("div", { class: "deliveries-toolbar" }, [
    searchInput,
    statusSelect,
    sortSelect,
    viewToggleContainer
  ]);

  mainHeader.push(toolbar);

  // --- LAYOUT SETUP ---
  const layout = createMainLayout({
    mainContent: mainHeader,
    asideContent,
    pageClass: "deliveries-page"
  });

  contentContainer.append(layout);
  const mainElement = layout.querySelector(".layout-main");
  const listContainer = createElement("div", { class: "deliveries-list-container" });
  mainElement.append(listContainer);

  // --- VIEW MODE TOGGLE HELPER ---
  function setViewMode(mode, btnElement) {
    currentViewMode = mode;
    const buttons = viewToggleContainer.querySelectorAll(".btn-view-toggle");
    buttons.forEach((btn) => btn.classList.remove("active"));
    if (btnElement) btnElement.classList.add("active");
    renderList();
  }

  // --- FETCH DELIVERIES ---
  async function loadDeliveries() {
    listContainer.innerHTML = `<div class="deliveries-loading">Loading shipments...</div>`;
    try {
      const resp = await fetchAllDeliveries();
      rawDeliveries = Array.isArray(resp) ? resp : resp?.data || resp?.deliveries || [];
      applyFiltersAndRender();
    } catch (err) {
      listContainer.innerHTML = `<div class="deliveries-error">${err?.message || "Failed to load deliveries."}</div>`;
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
      if (sortBy === "payout") return (b.payout || 0) - (a.payout || 0);
      if (sortBy === "expiry") return new Date(a.expires_at || Date.now()).getTime() - new Date(b.expires_at || Date.now()).getTime();
      return new Date(b.created_at || Date.now()).getTime() - new Date(a.created_at || Date.now()).getTime();
    });

    renderList();
  }

  // --- RENDER MAIN CONTENT ---
  function renderList() {
    listContainer.replaceChildren();

    if (!filteredDeliveries.length) {
      listContainer.append(createElement("div", { class: "deliveries-empty" }, ["No matching deliveries found."]));
      return;
    }

    // Feature 1: Map View Handler
    if (currentViewMode === "map") {
      const mapPlaceholder = createElement("div", { class: "deliveries-map-view" }, [
        createElement("p", {}, [`Interactive Map Mode (${filteredDeliveries.length} Pins loaded)`])
      ]);
      listContainer.append(mapPlaceholder);
      return;
    }

    // Feature 3: Pagination / Load More
    const paginatedItems = filteredDeliveries.slice(0, currentPage * PAGE_SIZE);
    const gridOrListClass = currentViewMode === "grid" ? "deliveries-grid" : "deliveries-list-view";
    const contentBox = createElement("div", { class: gridOrListClass });

    paginatedItems.forEach((item, idx) => {
      contentBox.append(createDeliveryCard(item, userRole, renderList));

      // Inject in-list ad after every 5th item
      if ((idx + 1) % 5 === 0) {
        contentBox.append(
          adspace("inlist", PAGE_NAME, { width: "100%", height: 120 })
        );
      }
    });

    listContainer.append(contentBox);

    // Feature 3: "Load More" controls
    if (paginatedItems.length < filteredDeliveries.length) {
      const loadMoreBtn = Button(
        `Load More (${filteredDeliveries.length - paginatedItems.length} remaining)`,
        "btn-load-more",
        {
          click: () => {
            currentPage++;
            renderList();
          }
        },
        "buttonx secondary btn-load-more"
      );
      listContainer.append(loadMoreBtn);
    }
  }

  // Execute Initial Load
  await loadDeliveries();
}

// ---------- CARD BUILDER (FEATURES 0, 4, 5, 6) ----------
function createDeliveryCard(item, userRole, onRenderList) {
  const deliveryId = item.deliveryid ?? item.id ?? "N/A";
  const status = (item.status || "AVAILABLE").toUpperCase();
  const payout = item.payout ? `$${Number(item.payout).toFixed(2)}` : "$15.00";

  // Feature 6: Distance & Estimated Time Calculation
  const distance = item.distance_km || calculateDistance(item.pickup_loc, item.dropoff_loc);
  const estTimeMinutes = Math.round((distance / 25) * 60) + 10; // ~25km/h avg speed + buffer

  // Feature 5: Package Attributes Badges
  const badgesContainer = createElement("div", { class: "badge-group" }, [
    createElement("span", { class: "badge badge-weight" }, [
      item.package_weight ? `${item.package_weight} kg` : "< 5 kg"
    ]),
    createElement("span", { class: "badge badge-vehicle" }, [
      item.vehicle_type || "Car / Bike"
    ]),
    item.is_fragile ? createElement("span", { class: "badge badge-fragile" }, ["Fragile"]) : null
  ].filter(Boolean));

  // Feature 4: Expiry / Timeout Countdown
  const expiryContainer = createElement("div", { class: "expiry-countdown" });
  if (status === "AVAILABLE") {
    const expiresAt = item.expires_at ? new Date(item.expires_at).getTime() : Date.now() + 45 * 60 * 1000;
    startCountdown(expiresAt, expiryContainer);
  }

  // Feature 0: Role-Based Views & Actions
  const cardActions = createElement("div", { class: "delivery-card-actions" });

  if (userRole === "courier" && status === "AVAILABLE") {
    const claimBtn = Button(`Claim (${payout})`, "", {
      click: async (e) => {
        e.stopPropagation();
        try {
          await claimDelivery(deliveryId);
          Notify("Delivery claimed successfully!", { type: "success" });
          item.status = "CLAIMED";
          navigate(`/delivery/${deliveryId}`);
        } catch (err) {
          Notify(err?.message || "Failed to claim delivery.", { type: "error" });
        }
      }
    }, "btn-primary");
    cardActions.append(claimBtn);
  } else if (userRole === "sender" && (status === "CREATED" || status === "AVAILABLE")) {
    const cancelBtn = Button("Cancel Order", "", {
      click: async (e) => {
        e.stopPropagation();
        try {
          await cancelDelivery(deliveryId);
          Notify("Delivery request cancelled.", { type: "info" });
          item.status = "CANCELLED";
          if (onRenderList) onRenderList();
        } catch (err) {
          Notify(err?.message || "Failed to cancel order.", { type: "error" });
        }
      }
    }, "btn-secondary");
    cardActions.append(cancelBtn);
  }

  // View Details default link button
  cardActions.append(
    Button("Details", "", { click: () => navigate(`/delivery/${deliveryId}`) }, "btn-secondary")
  );

  return createElement("div", { class: "delivery-card" }, [
    createElement("div", { class: "card-header" }, [
      createElement("strong", {}, [`ID: ${deliveryId}`]),
      createElement("span", { class: `status-badge status-${status.toLowerCase()}` }, [status])
    ]),
    badgesContainer,
    createElement("div", { class: "card-body" }, [
      createElement("p", {}, [createElement("strong", {}, ["Pickup: "]), item.pickup_loc?.address || "N/A"]),
      createElement("p", {}, [createElement("strong", {}, ["Dropoff: "]), item.dropoff_loc?.address || "N/A"]),
      createElement("p", {}, [createElement("strong", {}, ["Distance: "]), `${distance} km (~${estTimeMinutes} mins)`]),
      createElement("p", {}, [createElement("strong", {}, ["Created: "]), Datex(item.created_at || Date.now())]),
      expiryContainer
    ]),
    cardActions
  ]);
}

// Countdown timer helper
function startCountdown(targetTimestamp, element) {
  function update() {
    const diff = targetTimestamp - Date.now();
    if (diff <= 0) {
      element.textContent = "Expired";
      return;
    }
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    element.textContent = `Expires in: ${mins}m ${secs}s`;
  }
  update();
  setInterval(update, 1000);
}

// Distance helper calculation (Haversine Formula)
function calculateDistance(locA, locB) {
  if (!locA?.lat || !locB?.lat) return 4.5; // Default distance fallback
  const R = 6371;
  const dLat = (locB.lat - locA.lat) * (Math.PI / 180);
  const dLng = (locB.lng - locA.lng) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(locA.lat * (Math.PI / 180)) * Math.cos(locB.lat * (Math.PI / 180)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const Deliveries = displayDeliveries;