import { createheader } from "../components/layout/header.js";
import { createNav, highlightActiveNav } from "../components/layout/navigation.js";
import { render } from "./router.js";
import { staticRoutes } from "./routes.js";
import { setState, getRouteState, saveScroll, restoreScroll, subscribe } from "../state/state.js";
import { Footer } from "../components/layout/footer.js";
import { track } from "../services/activity/metrics.js";
import { startPerfMonitoring } from "../services/activity/perfMonitor.js";
import { abortInflightApiRequests } from "../api/api.js";

const layoutState = {
  isHydrated: false,
  headerRendered: false,
  navRendered: false,
  footerRendered: false,
  isNavigating: false
};

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

function isNavHidden(url) {
  return false;
}

function hydrateAuthState() {
  if (layoutState.isHydrated) return;

  const token = localStorage.getItem("token");
  const userRaw = localStorage.getItem("user");

  if (token && userRaw) {
    let user = userRaw;
    const trimmed = userRaw.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        user = JSON.parse(trimmed);
      } catch (err) {
        console.warn("Failed parsing stored user JSON:", err);
      }
    }
    setState({ token, user }, true);
  }

  layoutState.isHydrated = true;
}

async function loadContent(url) {
  const { header, nav, main, footer } = getElements();

  if (!header || !nav || !main || !footer) {
    console.error("❌ Missing static layout containers in HTML.");
    return;
  }

  hydrateAuthState();

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

  const shouldHideNav = isNavHidden(url);
  const targetDisplay = shouldHideNav ? "none" : "";

  if (nav.style.display !== targetDisplay) {
    nav.style.display = targetDisplay;
  }

  if (!shouldHideNav) {
    highlightActiveNav(url);
  }

  await render(url, main);

  const routeState = getRouteState(url);
  if (routeState) {
    requestAnimationFrame(() => restoreScroll(main, routeState));
  } else {
    window.scrollTo(0, 0);
  }
}

export function navigate(path, { storeRedirect = false, replace = false } = {}) {
  if (!path) return;

  const currentPath = window.location.pathname + window.location.search + window.location.hash;
  if (currentPath === path) return;

  // Cancel pending API requests from the previous view
  abortInflightApiRequests();

  try {
    const { main } = getElements();
    if (main) {
      saveScroll(main, getRouteState(window.location.pathname));
    }

    if (storeRedirect && !["/", "/login", "/logout"].includes(window.location.pathname)) {
      localStorage.setItem("redirectAfterLogin", window.location.pathname);
    }

    if (replace) {
      history.replaceState(null, "", path);
    } else {
      history.pushState(null, "", path);
    }

    track("pageview", { path });

    loadContent(path).catch((err) => {
      console.error("Navigation rendering failed:", err);
    });

  } catch (error) {
    console.error("Critical error during navigation setup:", error);
  }
}

// Mouseover prefetching logic
function initPrefetching() {
  document.addEventListener("mouseover", (e) => {
    const link = e.target.closest("a[data-prefetch]");
    if (!link) return;

    const href = link.getAttribute("href");
    if (!href) return;

    const route = staticRoutes[href];
    if (route && typeof route.moduleImport === "function" && !route._preloaded) {
      route.moduleImport(); // Warm module cache
      route._preloaded = true;
    }
  });
}

export async function renderPage() {
  startPerfMonitoring();
  initPrefetching();

  // Handle browser back and forward actions
  window.addEventListener("popstate", () => {
    abortInflightApiRequests();
    const currentUrl = window.location.pathname + window.location.search + window.location.hash;
    loadContent(currentUrl);
  });

  await loadContent(window.location.pathname + window.location.search + window.location.hash);
}

// Reactive UI updates on auth status change
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