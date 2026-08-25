import { clearElement } from "./listingcon.js";
import {
  createWeatherInfoWidget,
  createAuthForms,
} from "./homeHelpers.js";
import { adspace } from "../../services/ads/newads.js";
import { createMainLayout } from "../../components/layout/mainLayout.js";
import { createAsideContent } from "../../components/layout/asideLayout.js";

// --- MAIN HOME ---
export function YoHome(isLoggedIn: boolean, container: HTMLElement): void {
  clearElement(container);

  const PAGE_NAME = "home";

  // ---------- ASIDE CONTENT ----------
  const asideContent = createAsideContent({
    title: "",
    children: [
      createWeatherInfoWidget(),
    ],
    showAd: true,
    page: PAGE_NAME,
    adPosition: "aside",
    adPlacement: "bottom",
    adOptions: {
      layout: "vertical",
      width: 300,
      height: 250,
      refreshInterval: 30000,
    },
  });

  // ---------- MAIN CONTENT ----------
  const mainContent: (HTMLElement | Node)[] = [
    adspace("top", PAGE_NAME, {
      layout: "horizontal",
      width: 728,
      height: 90,
      refreshInterval: 45000,
    }),
    adspace("bottom", PAGE_NAME, {
      layout: "horizontal",
      width: 728,
      height: 90,
      refreshInterval: 60000,
    }),
  ];

  // ---------- LAYOUT ----------
  const layout = createMainLayout({
    mainContent,
    asideContent,
    pageClass: "hyperlocal-home",
  });

  // Handle conditional auth / listing tabs
  if (isLoggedIn) {
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