import { createheader } from "../components/layout/header.js";
import { createNav, highlightActiveNav } from "../components/layout/navigation.js";
import { render } from "./router.js";
import { setState, getRouteState, saveScroll, restoreScroll, subscribe } from "../state/state.js";
import { Footer } from "../components/layout/footer.js";
import { track } from "../services/activity/metrics.js";
import { startPerfMonitoring } from "../services/activity/perfMonitor.js";

const layoutState = {
  isHydrated: false,
  headerRendered: false,
  navRendered: false,
  footerRendered: false,
  isNavigating: false
};

// Cached DOM references (retrieved once on module execution/first access)
const elements = {
  header: null,
  nav: null,
  main: null,
  footer: null
};

function getElements() {
  if (!elements.main) {
    elements.header = document.getElementById("pageheader");
    elements.nav = document.getElementById("primary-nav");
    elements.main = document.getElementById("content");
    elements.footer = document.getElementById("pagefooter");
  }
  return elements;
}

/**
 * Checks if the navigation panel should be hidden for a given route.
 */
function isNavHidden(url) {
  return false;
}

/**
 * Hydrates persisted auth state from localStorage once.
 */
function hydrateAuthState() {
  if (layoutState.isHydrated) return;

  const token = localStorage.getItem("token");
  const userRaw = localStorage.getItem("user");

  if (token && userRaw) {
    let user = userRaw;
    const trimmed = userRaw.trim();
    const firstChar = trimmed.charAt(0);

    if (firstChar === "{" || firstChar === "[") {
      try {
        user = JSON.parse(trimmed);
      } catch (err) {
        console.warn("Failed parsing stored user JSON, falling back to raw string:", err);
      }
    }

    setState({ token, user }, true);
  }

  layoutState.isHydrated = true;
}

/**
 * Loads layout and route content into static containers
 * @param {string} url
 */
async function loadContent(url) {
  const { header, nav, main, footer } = getElements();

  if (!header || !nav || !main || !footer) {
    console.error("❌ Missing static layout containers in HTML.");
    return;
  }

  // 1. Hydrate persisted auth state once
  hydrateAuthState();

  // 2. Render static structural layout once
  if (!layoutState.headerRendered) {
    const headerContent = createheader();
    if (headerContent) header.replaceChildren(headerContent);
    layoutState.headerRendered = true;
  }

  if (!layoutState.navRendered) {
    const navContent = createNav();
    if (navContent) nav.replaceChildren(navContent);
    layoutState.navRendered = true;
  }

  if (!layoutState.footerRendered) {
    const footerContent = Footer();
    if (footerContent) footer.replaceChildren(footerContent);
    layoutState.footerRendered = true;
  }

  // 3. Toggle Navigation Visibility
  const shouldHideNav = isNavHidden(url);
  const targetDisplay = shouldHideNav ? "none" : "";

  if (nav.style.display !== targetDisplay) {
    nav.style.display = targetDisplay;
  }

  if (!shouldHideNav) {
    highlightActiveNav(url);
  }

  // 4. Render route content
  await render(url, main);

  // 5. Restore scroll using rAF to ensure DOM paint has settled
  const routeState = getRouteState(url);
  if (routeState) {
    requestAnimationFrame(() => restoreScroll(main, routeState));
  }
}

/**
 * SPA PushState navigation
 */
function navigate(path, { storeRedirect = false } = {}) {
  if (!path) return;

  const currentPath = window.location.pathname + window.location.search + window.location.hash;
  if (currentPath === path) {
    return;
  }

  if (layoutState.isNavigating) {
    console.warn("⚠️ Navigation is locked. Guarding against double-submission.");
    return;
  }

  layoutState.isNavigating = true;

  try {
    const { main } = getElements();
    if (main) {
      saveScroll(main, getRouteState(window.location.pathname));
    }

    if (storeRedirect && !["/", "/login", "/logout"].includes(window.location.pathname)) {
      localStorage.setItem("redirectAfterLogin", window.location.pathname);
    }

    history.pushState(null, "", path);

    // Track SPA navigation pageview
    track("pageview", { path });

    loadContent(path)
      .catch(err => {
        console.error("Navigation rendering failed:", err);
      })
      .finally(() => {
        layoutState.isNavigating = false;
      });

  } catch (error) {
    console.error("Critical error during navigation setup:", error);
    layoutState.isNavigating = false;
  }
}

/**
 * Initial render
 */
async function renderPage() {
  // Start performance monitoring on initial app mount
  startPerfMonitoring();
  await loadContent(window.location.pathname);
}

/* ------------------------------------------------------
    Reactive Layout Updates
--------------------------------------------------------- */
subscribe("token", () => {
  const { header, nav } = getElements();

  if (header) {
    const updatedHeader = createheader();
    if (updatedHeader) header.replaceChildren(updatedHeader);
  }

  if (nav) {
    const updatedNav = createNav();
    if (updatedNav) {
      nav.replaceChildren(updatedNav);
      const shouldHideNav = isNavHidden(window.location.pathname);
      nav.style.display = shouldHideNav ? "none" : "";
      if (!shouldHideNav) {
        highlightActiveNav(window.location.pathname);
      }
    }
  }
});

export { navigate, renderPage, loadContent };