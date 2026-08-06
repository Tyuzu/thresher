import { createElement } from "../../components/createElement.js";
import { clearElement, createListingTabs } from "./listingcon.js";
import {
  createWeatherInfoWidget,
  createSearchBar,
  createNavWrapper,
  createAuthForms
} from "./homeHelpers.js";
import { adspace } from "../../services/ads/newads.js";
import { createMainLayout } from "../../components/layout/mainLayout.js";

// --- MAIN HOME ---
export function YoHome(isLoggedIn, container) {
  clearElement(container);

  const PAGE_NAME = "home";

  // ---------- ASIDE CONTENT ----------
  const asideContent = [
    createWeatherInfoWidget(),
    createSearchBar(),
    // Sidebar Ad: 300x250 Medium Rectangle with 30s auto-refresh
    adspace("aside", PAGE_NAME, {
      width: 300,
      height: 250,
      refreshInterval: 30000
    })
  ];

  // ---------- MAIN CONTENT ----------
  const mainContent = [
    // Top Hero Leaderboard (728x90) with 45s auto-refresh
    adspace("top", PAGE_NAME, {
      width: 728,
      height: 90,
      refreshInterval: 45000
    }),
    createNavWrapper(),
    // Bottom In-Body Banner (728x90) with 60s auto-refresh
    adspace("bottom", PAGE_NAME, {
      width: 728,
      height: 90,
      refreshInterval: 60000
    })
  ];

  // Handle conditional auth / listing tabs
  if (isLoggedIn) {
    // defer heavy DOM work
    requestIdleCallback(() => {
      const mainElement = layout.querySelector(".layout-main");
      if (mainElement) {
        mainElement.appendChild(createListingTabs());
      }
    });
  } else {
    mainContent.push(createAuthForms());
  }

  // ---------- LAYOUT ----------
  const layout = createMainLayout({
    mainContent,
    asideContent,
    pageClass: "hyperlocal-home"
  });

  const fragment = document.createDocumentFragment();
  fragment.appendChild(layout);

  container.appendChild(fragment);
}