import Modal from "./ui/Modal.mjs";
import { createElement } from "../components/createElement.js";
import { navigate } from "../routes/index.js";

/* ---------------------------------- */
/* Config                             */
/* ---------------------------------- */

const LINKS = [
  { href: "/farms", label: "Farms" },
  { href: "/dash", label: "Dash" }
];

const TILES = [
  { label: "Weather", value: "Clear, 22°C" }
];

/* ---------------------------------- */
/* State                              */
/* ---------------------------------- */

let activeControlCenter = null;

/* ---------------------------------- */
/* Component Builders                 */
/* ---------------------------------- */

function buildPersonalHub() {
  return createElement("div", { class: "cc-personal-hub" }, [
    createElement("div", { class: "cc-avatar" }),
    createElement("div", { class: "cc-profile-name" }, ["Guest User"]),
    createElement("div", { class: "cc-btn-row" }, [
      createElement(
        "button",
        { class: "cc-small-btn", "data-nav": "/profile" },
        ["Edit Profile"]
      ),
      createElement(
        "button",
        { class: "cc-small-btn", "data-action": "logout" },
        ["Logout"]
      )
    ])
  ]);
}

function buildTiles() {
  const tiles = TILES.map(tile =>
    createElement("div", { class: "cc-live-tile" }, [
      createElement("div", { class: "cc-tile-label" }, [tile.label]),
      createElement("div", { class: "cc-tile-value" }, [tile.value])
    ])
  );

  return createElement("div", { class: "cc-tiles" }, tiles);
}

function buildNavGrid() {
  const buttons = LINKS.map(link =>
    createElement(
      "button",
      {
        class: "cc-nav-link",
        type: "button",
        "data-nav": link.href
      },
      [link.label]
    )
  );

  return createElement("div", { class: "cc-nav-grid" }, buttons);
}

function buildControlCenterContent() {
  const handle = createElement("div", { class: "cc-handle" });
  const personalHub = buildPersonalHub();
  const liveTiles = buildTiles();
  const navGrid = buildNavGrid();

  return createElement("div", { class: "cc-scroll" }, [
    handle,
    personalHub,
    liveTiles,
    navGrid
  ]);
}

/* ---------------------------------- */
/* Event & Gesture Delegation          */
/* ---------------------------------- */

function attachHandlers(dialog, closeFn) {
  // Delegate click navigation & custom actions
  dialog.addEventListener("click", e => {
    const navTarget = e.target.closest("[data-nav]");
    if (navTarget) {
      navigate(navTarget.dataset.nav);
      closeFn();
      return;
    }

    const actionTarget = e.target.closest("[data-action]");
    if (actionTarget?.dataset.action === "logout") {
      handleLogout();
      closeFn();
      return;
    }
  });

  // Drag-to-dismiss gesture (Pointer Events)
  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  dialog.addEventListener("pointerdown", e => {
    // Only capture drag on header/handle area or background, avoiding input elements
    if (e.target.closest("button, a, input, select, textarea")) return;
    
    isDragging = true;
    startY = e.clientY;
    dialog.style.transition = "none";
  });

  dialog.addEventListener("pointermove", e => {
    if (!isDragging) return;

    currentY = e.clientY;
    const diff = Math.max(0, currentY - startY);

    if (diff > 0) {
      dialog.style.transform = `translateY(${diff}px)`;
    }
  });

  const endDrag = () => {
    if (!isDragging) return;
    isDragging = false;

    dialog.style.transition = "";
    const diff = currentY - startY;

    if (diff > 100) {
      closeFn();
    } else {
      dialog.style.transform = "";
    }
  };

  dialog.addEventListener("pointerup", endDrag);
  dialog.addEventListener("pointercancel", endDrag);
}

function handleLogout() {
  // Add authentication/logout logic here
  console.log("Logging out...");
}

/* ---------------------------------- */
/* Public API                         */
/* ---------------------------------- */

export function toggleControlCenter() {
  if (activeControlCenter) {
    activeControlCenter.close();
    return;
  }

  const { dialog, close } = Modal({
    variant: "sheet",
    size: "medium",
    showHeader: true,
    showCloseButton: true,
    closeOnOverlayClick: true,
    flushBody: true,
    content: buildControlCenterContent,
    onAfterClose: () => {
      activeControlCenter = null;
    }
  });

  activeControlCenter = { dialog, close };
  attachHandlers(dialog, close);
}

// Named alias export for backwards compatibility
export { toggleControlCenter as toggleSidebar };