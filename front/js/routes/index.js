import { createheader } from "../components/header.js";
import { createNav, highlightActiveNav } from "../components/navigation.js";
import { render } from "./router.js";
import { setState, getRouteState, saveScroll, restoreScroll, subscribe } from "../state/state.js";
import { Footer } from "../components/footer.js";

const layoutState = {
  isHydrated: false,
  headerRendered: false,
  navRendered: false,
  footerRendered: false,
  isNavigating: false
};

/**
 * Checks if the navigation panel should be hidden for a given route.
 * Matches both static paths and dynamic sub-paths (e.g., /merechats, /merechats/123)
 */
function isNavHidden(url) {
  return url === "/merechats" || url.startsWith("/merechats/");
}

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
    
    // Only attempt parsing if it actually looks like a JSON object or array
    if (userRaw.trim().startsWith("{") || userRaw.trim().startsWith("[")) {
      try { 
        user = JSON.parse(userRaw); 
      } catch (err) {
        console.warn("Failed parsing stored user JSON, falling back to raw string:", err);
      }
    }
    
    setState({ token, user }, true);
  }
  layoutState.isHydrated = true;
}

  // --- 1. Render Global Structural Layout Once ---
  if (!layoutState.headerRendered) {
    const headerContent = createheader();
    if (headerContent) {
      header.replaceChildren(headerContent);
    }
    layoutState.headerRendered = true;
  }

  if (!layoutState.navRendered) {
    const navContent = createNav();
    if (navContent) {
      nav.replaceChildren(navContent);
    }
    layoutState.navRendered = true;
  }

  if (!layoutState.footerRendered) {
    const footerContent = Footer();
    if (footerContent) {
      footer.replaceChildren(footerContent);
    }
    layoutState.footerRendered = true;
  }

  // --- 2. Toggle Navigation Visibility (Supports Dynamic Routes) ---
  const shouldHideNav = isNavHidden(url);
  nav.style.display = shouldHideNav ? "none" : ""; 

  if (!shouldHideNav) {
    highlightActiveNav(url);
  }

  // --- 3. Render Views Seamlessly ---
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
  if (!path) return;

  // Prevent double-clicks, but allow if it's a genuine new path
  if (layoutState.isNavigating) {
    console.warn("⚠️ Navigation is locked. Guarding against double-submission.");
    return;
  }

  const currentPath = window.location.pathname + window.location.search + window.location.hash;
  if (currentPath === path) {
    return;
  }

  layoutState.isNavigating = true;

  try {
    const contentElement = document.getElementById("content");
    saveScroll(contentElement, getRouteState(window.location.pathname));

    if (storeRedirect && !["/", "/login", "/logout"].includes(window.location.pathname)) {
      localStorage.setItem("redirectAfterLogin", window.location.pathname);
    }

    history.pushState(null, "", path);

    // Force unlock after loading finishes or fails
    loadContent(path)
      .catch(err => {
        console.error("Navigation rendering failed:", err);
      })
      .finally(() => {
        layoutState.isNavigating = false; // 👈 Absolute safety valve
      });

  } catch (error) {
    console.error("Critical error during navigation setup:", error);
    layoutState.isNavigating = false; // 👈 Absolute safety fallback
  }
}

/**
 * Initial render
 */
async function renderPage() {
  await loadContent(window.location.pathname);
}

/* ------------------------------------------------------
    Reactive Layout Updates
--------------------------------------------------------- */
// Automatically sync the global header and nav elements when the user signs in or out
subscribe("token", () => {
  const header = document.getElementById("pageheader");
  const nav = document.getElementById("primary-nav");

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