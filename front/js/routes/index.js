import { createheader } from "../components/layout/header.js";
import { createNav, highlightActiveNav } from "../components/layout/navigation.js";
import { render } from "./router.js";
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

const elements = { header: null, nav: null, main: null, footer: null };

function getElements() {
  if (!elements.main) {
    elements.header = document.getElementById("pageheader");
    elements.nav = document.getElementById("primary-nav");
    elements.main = document.getElementById("content");
    elements.footer = document.getElementById("pagefooter");
  }
  return elements;
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

export async function loadContent(url) {
  const { header, nav, main, footer } = getElements();
  if (!header || !nav || !main || !footer) return;

  hydrateAuthState();

  if (!layoutState.headerRendered) {
    const h = createheader();
    if (h) header.replaceChildren(h);
    layoutState.headerRendered = true;
  }

  if (!layoutState.navRendered) {
    const n = createNav();
    if (n) nav.replaceChildren(n);
    layoutState.navRendered = true;
  }

  if (!layoutState.footerRendered) {
    const f = Footer();
    if (f) footer.replaceChildren(f);
    layoutState.footerRendered = true;
  }

  highlightActiveNav(url);

  // Render match & component
  await render(url, main);

  const routeState = getRouteState(url);
  if (routeState) {
    requestAnimationFrame(() => restoreScroll(main, routeState));
  }
}

export function navigate(path, { storeRedirect = false } = {}) {
  if (!path) return;

  const currentPath = window.location.pathname + window.location.search + window.location.hash;
  if (currentPath === path) return;

  if (layoutState.isNavigating) return;
  layoutState.isNavigating = true;

  try {
    // Abort obsolete API requests upon route change
    abortInflightApiRequests();

    const { main } = getElements();
    if (main) saveScroll(main, getRouteState(window.location.pathname));

    if (storeRedirect && !["/", "/login", "/logout"].includes(window.location.pathname)) {
      localStorage.setItem("redirectAfterLogin", window.location.pathname);
    }

    history.pushState(null, "", path);
    track("pageview", { path });

    loadContent(path)
      .catch((err) => console.error("Navigation rendering failed:", err))
      .finally(() => {
        layoutState.isNavigating = false;
      });
  } catch (error) {
    console.error("Critical error during navigation:", error);
    layoutState.isNavigating = false;
  }
}

export async function renderPage() {
  startPerfMonitoring();
  await loadContent(window.location.pathname + window.location.search + window.location.hash);
}

subscribe("token", () => {
  const { header, nav } = getElements();
  if (header) {
    const updatedHeader = createheader();
    if (updatedHeader) header.replaceChildren(updatedHeader);
  }
  if (nav) {
    const updatedNav = createNav();
    if (updatedNav) nav.replaceChildren(updatedNav);
  }
});