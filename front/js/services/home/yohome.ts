import { createElement } from "../../components/createElement.js";
import { clearElement } from "./listingcon.js";
// import { clearElement, createListingTabs } from "./listingcon.js";
import {
  createWeatherInfoWidget,
  // createSearchBar,
  // createNavWrapper,
  createAuthForms
} from "./homeHelpers.js";
import { adspace } from "../../services/ads/newads.js";
import { createMainLayout } from "../../components/layout/mainLayout.js";
import { createAsideContent } from "../../components/layout/asideLayout.js";

// --- MAIN HOME ---
export function YoHome(isLoggedIn, container) {
  clearElement(container);

  const PAGE_NAME = "home";

  // ---------- ASIDE CONTENT ----------
  // Using the refactored helper:
  // - title: null removes the default "Actions" heading
  // - adPlacement: "bottom" places the ad below the weather and search widgets
  const asideContent = createAsideContent({
    title: null,
    children: [
      createWeatherInfoWidget(),
      // createSearchBar()
    ],
    showAd: true,
    page: PAGE_NAME,
    adPosition: "aside",
    adPlacement: "bottom", // "top", "middle", or "bottom"
    adOptions: {
      layout: "vertical",
      width: 300,
      height: 250,
      refreshInterval: 30000
    }
  });

  // ---------- MAIN CONTENT ----------
  const mainContent = [
    // Top Hero Leaderboard (728x90) with 45s auto-refresh
    adspace("top", PAGE_NAME, {
      layout: "horizontal",
      width: 728,
      height: 90,
      refreshInterval: 45000
    }),
    // createNavWrapper(),
    // Bottom In-Body Banner (728x90) with 60s auto-refresh
    adspace("bottom", PAGE_NAME, {
      layout: "horizontal",
      width: 728,
      height: 90,
      refreshInterval: 60000
    })
  ];

  // ---------- LAYOUT ----------
  const layout = createMainLayout({
    mainContent,
    asideContent,
    pageClass: "hyperlocal-home"
  });

  // Handle conditional auth / listing tabs
  if (isLoggedIn) {
    // Defer heavy DOM work
    requestIdleCallback(() => {
      const mainElement = layout.querySelector(".layout-main");
      // if (mainElement) {
      //   mainElement.appendChild(createListingTabs());
      // }
    });
  } else {
    mainContent.push(createAuthForms());
  }

  const fragment = document.createDocumentFragment();
  fragment.appendChild(layout);

  container.appendChild(fragment);
}