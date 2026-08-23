import { navigate, loadContent, getCurrentAppLocation, hydrateAuthState } from "./index.js";
import { trackError } from "../utils/app/errors.js";

/* =========================================================
   ACCESSIBILITY
========================================================= */
function focusMainContent(): void {
  const content = document.getElementById("content");
  if (!content) return;

  if (!content.hasAttribute("tabindex")) {
    content.setAttribute("tabindex", "-1");
  }

  try {
    content.focus({ preventScroll: true });
  } catch {
    content.focus();
  }
}

/* =========================================================
   GLOBAL SPA NAVIGATION
========================================================= */
export function isModifiedClick(event: MouseEvent): boolean {
  return event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0;
}

export function isSpecialLink(anchor: HTMLAnchorElement): boolean {
  const href = anchor.getAttribute("href");
  if (!href) return true;

  if (
    anchor.target === "_blank" ||
    anchor.hasAttribute("download") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("javascript:")
  ) {
    return true;
  }

  try {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return true;
  } catch {
    return true;
  }
  return false;
}

export function isSpaRoute(href: string | null): boolean {
  if (!href) return false;
  return href.startsWith("/") || href.startsWith("#/");
}

export function setupGlobalNavigation(): void {
  document.addEventListener("click", (event: MouseEvent) => {
    const target = event.target;
    const anchor = target instanceof Element ? target.closest("a") : null;
    if (!anchor) return;

    if (isModifiedClick(event)) return;
    if (isSpecialLink(anchor)) return;

    const href = anchor.getAttribute("href");
    if (!href) return;

    if (href.startsWith("#") && !href.startsWith("#/")) return;
    if (!isSpaRoute(href)) return;

    event.preventDefault();
    navigate(href).catch((error: unknown) => {
      trackError(error, {
        type: "navigation_failure",
        path: href
      });
    });
  });
}

/* =========================================================
   HISTORY / BACK / FORWARD
========================================================= */
export function setupHistoryNavigation(): void {
  window.addEventListener("popstate", async () => {
    try {
      await loadContent(getCurrentAppLocation());
      focusMainContent();
    } catch (error: unknown) {
      trackError(error, { type: "popstate_navigation_failure" });
    }
  });

  window.addEventListener("pageshow", async (event: PageTransitionEvent) => {
    if (!event.persisted) return;
    try {
      hydrateAuthState(true);
      await loadContent(getCurrentAppLocation());
      focusMainContent();
    } catch (error: unknown) {
      trackError(error, { type: "pageshow_navigation_failure" });
    }
  });
}