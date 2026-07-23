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
    createElement("div", { class: "cc-avatar", role: "img", "aria-label": "User Avatar" }),
    createElement("div", { class: "cc-profile-name" }, ["Guest User"]),
    createElement("div", { class: "cc-btn-row" }, [
      createElement(
        "button",
        { class: "cc-small-btn", type: "button", "data-nav": "/profile" },
        ["Edit Profile"]
      ),
      createElement(
        "button",
        { class: "cc-small-btn", type: "button", "data-action": "logout" },
        ["Logout"]
      )
    ])
  ]);
}

function buildTiles() {
  const tiles = TILES.map(tile =>
    createElement("div", { class: "cc-live-tile", role: "region", "aria-label": tile.label }, [
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

  return createElement("div", { class: "cc-nav-grid", role: "navigation" }, buttons);
}

function buildControlCenterContent() {
  const handle = createElement("div", { class: "cc-handle", "aria-hidden": "true" });
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
/* Event & Gesture Delegation         */
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

  /* --- Drag-to-dismiss Gesture --- */
  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  const onPointerDown = e => {
    // Avoid initiating drag on interactive elements or if inner area is scrolled down
    const isInteractive = e.target.closest("button, a, input, select, textarea");
    const scrollContainer = dialog.querySelector(".cc-scroll");
    const isScrolled = scrollContainer && scrollContainer.scrollTop > 0;

    if (isInteractive || isScrolled) return;

    isDragging = true;
    startY = e.clientY;
    currentY = e.clientY;
    dialog.style.transition = "none";

    // Capture pointer to ensure smooth drag even if cursor leaves bounds
    if (dialog.setPointerCapture) {
      dialog.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = e => {
    if (!isDragging) return;

    currentY = e.clientY;
    const diff = Math.max(0, currentY - startY);

    if (diff > 0) {
      dialog.style.transform = `translateY(${diff}px)`;
    }
  };

  const endDrag = e => {
    if (!isDragging) return;
    isDragging = false;

    if (dialog.releasePointerCapture && e.pointerId) {
      try { dialog.releasePointerCapture(e.pointerId); } catch (_) {}
    }

    dialog.style.transition = "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)";
    const diff = currentY - startY;

    // Dismiss threshold (100px)
    if (diff > 100) {
      closeFn();
    } else {
      dialog.style.transform = "";
    }
  };

  dialog.addEventListener("pointerdown", onPointerDown);
  dialog.addEventListener("pointermove", onPointerMove);
  dialog.addEventListener("pointerup", endDrag);
  dialog.addEventListener("pointercancel", endDrag);
}

function handleLogout() {
  console.log("Logging out user...");
  // Connect your auth provider logout logic here
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
    showHeader: false,
    showCloseButton: true,
    closeOnOverlayClick: true,
    flushBody: true,
    content: buildControlCenterContent,
    onAfterClose: () => {
      if (dialog) {
        dialog.style.transform = "";
        dialog.style.transition = "";
      }
      activeControlCenter = null;
    }
  });

  activeControlCenter = { dialog, close };
  attachHandlers(dialog, close);
}

// Backwards compatibility alias
export { toggleControlCenter as toggleSidebar };