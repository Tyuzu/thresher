import { createheader } from "../components/header.js";
import { createNav, highlightActiveNav } from "../components/navigation.js";
import { render } from "./router.js";
import { setState, getRouteState, saveScroll, restoreScroll } from "../state/state.js";
import { Footer } from "../components/footer.js";

const layoutState = {
  isHydrated: false,
  headerRendered: false,
  navRendered: false,
  footerRendered: false,
  isNavigating: false
};

/**
 * Loads layout and route content into static containers
 * @param {string} url
 */
async function loadContent(url) {
  const header = document.getElementById("pageheader");
  const nav = document.getElementById("primary-nav");
  const main = document.getElementById("content");
  const footer = document.getElementById("pagefooter");

  if (!header || !nav || !main || !footer) {
    console.error("❌ Missing static layout containers in HTML.");
    return;
  }

  /* -------------------- Hydrate persisted auth state once -------------------- */
  if (!layoutState.isHydrated) {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");

    if (token && userRaw) {
      let user = userRaw;
      try { user = JSON.parse(userRaw); } catch {}
      setState({ token, user }, true);
    }
    layoutState.isHydrated = true;
  }

  // --- 1. Render Global Structural Layout Once ---
  if (!layoutState.headerRendered) {
    const headerContent = createheader();
    if (headerContent) header.appendChild(headerContent);
    layoutState.headerRendered = true;
  }

  if (!layoutState.navRendered) {
    const navContent = createNav();
    if (navContent) nav.appendChild(navContent);
    layoutState.navRendered = true;
  }

  if (!layoutState.footerRendered) {
    const footerContent = Footer();
    if (footerContent) footer.appendChild(footerContent);
    layoutState.footerRendered = true;
  }

  // --- 2. Toggle Navigation Visibility Reactively ---
  const shouldHideNav = ["/merechats"].includes(url);
  nav.style.display = shouldHideNav ? "none" : ""; 

  if (!shouldHideNav) {
    highlightActiveNav(url);
  }

  // --- 3. Render Views Seamlessly ---
  // Note: main.replaceChildren() should ideally happen inside render() right before insertion
  await render(url, main);

  const routeState = getRouteState(url);
  if (routeState) {
    restoreScroll(main, routeState);
  }
}

/**
 * SPA PushState navigation
 */
function navigate(path, { storeRedirect = false } = {}) {
  if (!path) {
    console.error("🚨 navigate called with null or undefined!", new Error().stack);
    return;
  }

  if (layoutState.isNavigating || window.location.pathname === path) {
    return;
  }

  layoutState.isNavigating = true;

  saveScroll(
    document.getElementById("content"),
    getRouteState(window.location.pathname)
  );

  if (storeRedirect && !["/", "/login", "/logout"].includes(window.location.pathname)) {
    localStorage.setItem("redirectAfterLogin", window.location.pathname);
  }

  history.pushState(null, "", path);

  loadContent(path)
    .catch(err => console.error("Navigation failed:", err))
    .finally(() => {
      layoutState.isNavigating = false;
    });
}

/**
 * Initial render
 */
async function renderPage() {
  await loadContent(window.location.pathname);
}

// NOTE: Duplicated window.popstate listener removed. It is handled in the main execution file.

export { navigate, renderPage, loadContent };