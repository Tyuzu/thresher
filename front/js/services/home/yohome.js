import { createElement } from "../../components/createElement.js";
import { clearElement, createListingTabs } from "./listingcon.js";
import {
  createWeatherInfoWidget,
  createSearchBar,
  createNavWrapper,
  createAuthForms,
  adspace
} from "./homeHelpers.js";
import { createMainLayout } from "../../components/layout/mainLayout.js";

// --- MAIN HOME ---
export function YoHome(isLoggedIn, container) {
  clearElement(container);

  // ---------- ASIDE CONTENT ----------
  const asideContent = [
    createWeatherInfoWidget(),
    createSearchBar()
  ];

  // ---------- MAIN CONTENT ----------
  const mainContent = [
    adspace("top"),
    createNavWrapper(),
    adspace("bottom")
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