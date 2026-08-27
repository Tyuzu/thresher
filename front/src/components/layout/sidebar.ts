import "../../../css/subpages/sidebar.css";
import Modal from "../ui/Modal.js";
import { createElement } from "../createElement.js";
import { navigate } from "../../routes/navigate.js";
import Imagex from "../base/Imagex.js";
import { getState } from "../../state/state.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { silentLogout } from "../../services/auth/authService.js";

/* ---------------------------------- */
/* Types & Interfaces                 */
/* ---------------------------------- */

export interface NavLinkConfig {
  href: string;
  label: string;
}

export interface TileConfig {
  label: string;
  value: string;
}

export interface UserState {
  id?: string;
  userid?: string;
  username?: string;
  name?: string;
  [key: string]: unknown;
}

export interface ActiveControlCenter {
  dialog: HTMLElement;
  close: () => void;
}

/* ---------------------------------- */
/* Config                             */
/* ---------------------------------- */

const LINKS: NavLinkConfig[] = [
  { href: "/grocery", label: "Grocery" },
  { href: "/recipes", label: "Recipes" },
  { href: "/farms", label: "Farms" },
  { href: "/dash", label: "Dash" }
];

const TILES: TileConfig[] = [
  { label: "Weather", value: "Clear, 22°C" }
];

/* ---------------------------------- */
/* State                              */
/* ---------------------------------- */

let activeControlCenter: ActiveControlCenter | null = null;

/* ---------------------------------- */
/* Component Builders                 */
/* ---------------------------------- */

function buildPersonalHub(): HTMLDivElement {
  const user = (getState("user") || {}) as UserState;
  const userid = user.userid || user.id;

  const avatarUrl = userid
    ? resolveImagePath(EntityType.USER, PictureType.THUMB, `${userid}.jpg`)
    : "";

  const avatarImage = Imagex({ src: avatarUrl, alt: "User avatar", classes: "chat-message-avatar" });

  const avatarContainer = createElement(
    "div",
    { class: "cc-avatar", role: "img", "aria-label": "User Avatar" },
    [avatarImage]
  );

  return createElement("div", { class: "cc-personal-hub" }, [
    avatarContainer,
    createElement("div", { class: "cc-profile-name" }, [user.name || user.username || "Guest User"]),
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
  ]) as HTMLDivElement;
}

function buildTiles(): HTMLDivElement {
  const tiles = TILES.map(tile =>
    createElement("div", { class: "cc-live-tile", role: "region", "aria-label": tile.label }, [
      createElement("div", { class: "cc-tile-label" }, [tile.label]),
      createElement("div", { class: "cc-tile-value" }, [tile.value])
    ])
  );

  return createElement("div", { class: "cc-tiles" }, tiles) as HTMLDivElement;
}

function buildNavGrid(): HTMLDivElement {
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

  return createElement("div", { class: "cc-nav-grid", role: "navigation" }, buttons) as HTMLDivElement;
}

function buildControlCenterContent(): HTMLDivElement {
  const handle = createElement("div", { class: "cc-handle", "aria-hidden": "true" });
  const personalHub = buildPersonalHub();
  const liveTiles = buildTiles();
  const navGrid = buildNavGrid();

  return createElement("div", { class: "cc-scroll" }, [
    handle,
    personalHub,
    liveTiles,
    navGrid
  ]) as HTMLDivElement;
}

/* ---------------------------------- */
/* Event & Gesture Delegation         */
/* ---------------------------------- */

function handleLogout(): void {
  console.log("Logging out user...");
  silentLogout();
}
function attachHandlers(dialog: HTMLElement, closeFn: () => void): void {
  // Delegate click navigation & custom actions
  dialog.addEventListener("click", (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const navTarget = target.closest<HTMLElement>("[data-nav]");
    // Use bracket notation here 👇
    if (navTarget && navTarget.dataset['nav']) {
      navigate(navTarget.dataset['nav']);
      closeFn();
      return;
    }

    const actionTarget = target.closest<HTMLElement>("[data-action]");
    // Use bracket notation here 👇
    if (actionTarget?.dataset['action'] === "logout") {
      handleLogout();
      closeFn();
      return;
    }
  });

  /* --- Drag-to-dismiss Gesture --- */
  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  const onPointerDown = (e: PointerEvent): void => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Avoid initiating drag on interactive elements or if inner area is scrolled down
    const isInteractive = target.closest("button, a, input, select, textarea");
    const scrollContainer = dialog.querySelector<HTMLElement>(".cc-scroll");
    const isScrolled = Boolean(scrollContainer && scrollContainer.scrollTop > 0);

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

  const onPointerMove = (e: PointerEvent): void => {
    if (!isDragging) return;

    currentY = e.clientY;
    const diff = Math.max(0, currentY - startY);

    if (diff > 0) {
      dialog.style.transform = `translateY(${diff}px)`;
    }
  };

  const endDrag = (e: PointerEvent): void => {
    if (!isDragging) return;
    isDragging = false;

    if (dialog.releasePointerCapture && e.pointerId) {
      try {
        dialog.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture release safeguard
      }
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

  dialog.addEventListener("pointerdown", onPointerDown as EventListener);
  dialog.addEventListener("pointermove", onPointerMove as EventListener);
  dialog.addEventListener("pointerup", endDrag as EventListener);
  dialog.addEventListener("pointercancel", endDrag as EventListener);
}

/* ---------------------------------- */
/* Public API                         */
/* ---------------------------------- */

export function toggleControlCenter(): void {
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