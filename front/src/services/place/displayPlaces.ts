import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import { navigate } from "../../routes/navigate.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import Imagex from "../../components/base/Imagex.js";
import { adspace } from "../../services/ads/newads.js";
import { listPlacesRequest } from "./api.js";
import { createMainLayout } from "../../components/layout/mainLayout.js";
import { createAsideContent } from "../../components/layout/asideLayout.js";
import { Place } from "./placeDetails.js";

interface PlacesResponse {
  data?: Place[];
  places?: Place[];
}

export async function displayPlaces(
  isLoggedIn: boolean, 
  container: HTMLElement
): Promise<void> {
  container.replaceChildren();

  const PAGE_NAME = "places";

  // ---------- SIDEBAR SECTIONS ----------
  const actionButtons: HTMLElement[] = [];
  if (isLoggedIn) {
    actionButtons.push(
      Button({
        title: "Create Place",
        classes: "buttonx primary",
        events: { click: () => navigate("/create-place") },
      })
    );
  }

  actionButtons.push(
    Button({
      title: "Create Itinerary",
      classes: "buttonx primary",
      events: { click: () => navigate("/itinerary") },
    }),
    Button({
      title: "Manage Places",
      classes: "buttonx secondary",
      events: { click: () => navigate("/places/manage") },
    }),
    Button({
      title: "Help / FAQ",
      classes: "buttonx secondary",
      events: { click: () => navigate("/help") },
    })
  );

  const actionsWrapper = createElement("div", { class: "aside-actions-group" }, actionButtons);

  // Sidebar Ad component
  const sidebarAd = adspace("aside", PAGE_NAME, {
    layout: "vertical",
    width: 300,
    height: 250,
    refreshInterval: 30000
  });

  const asideContent = createAsideContent({
    title: "Places Overview",
    sections: [
      {
        title: "Actions",
        content: actionsWrapper,
        className: "aside-actions-section",
      },
      {
        content: sidebarAd,
        className: "aside-ad-section",
      },
    ],
    showAd: false, // Handled directly via custom section to prevent duplication
    page: PAGE_NAME,
  });

  // ---------- MAIN HEADER & INBODY AD ----------
  const mainHeader = [
    createElement("h1", {}, ["All Places"]),
    adspace("inbody", PAGE_NAME, {
      layout: "horizontal",
      width: 728,
      height: 90,
      refreshInterval: 45000
    })
  ];

  // ---------- LAYOUT ----------
  const layout = createMainLayout({
    mainContent: mainHeader,
    asideContent,
    pageClass: "places-page",
  });

  container.append(layout);

  const mainElement = layout.querySelector(".layout-main") as HTMLElement;
  const list = createElement("div", { class: "places-list" });

  // ---------- FETCH PLACES ----------
  let places: Place[] = [];
  try {
    const resp = await listPlacesRequest();
    if (Array.isArray(resp)) {
      places = resp;
    } else {
      places = resp?.data || resp?.places || [];
    }
  } catch (err) {
    console.error("Failed to load places", err);
  }

  // ---------- RENDER LIST ----------
  if (!places.length) {
    list.append(createElement("p", {}, ["No matching places."]));
  } else {
    places.forEach((place, idx) => {
      list.append(createPlaceCard(place));

      // Inject an in-list ad slot after every 5th place card
      if ((idx + 1) % 5 === 0) {
        list.append(
          adspace("inlist", PAGE_NAME, {
            layout: "vertical",
            width: "100%",
            height: 120
          })
        );
      }
    });
  }

  if (mainElement) {
    mainElement.append(list);
  }
}

// ---------- CARD BUILDER ----------
function createPlaceCard(place: Place): HTMLElement {
  const bannerUrl = place.banner
    ? resolveImagePath(EntityType.PLACE, PictureType.THUMB, place.banner)
    : resolveImagePath(EntityType.DEFAULT, PictureType.STATIC, "placeholder.png");

  const image = Imagex({
    src: bannerUrl,
    alt: `${place.name || "Unnamed"} Banner`,
    loading: "lazy",
  }) as HTMLImageElement;

  image.onerror = () => {
    image.src = resolveImagePath(EntityType.DEFAULT, PictureType.STATIC, "placeholder.png");
  };

  const metaRow = createElement(
    "div",
    {
      style: "display:flex;align-items:center;justify-content:space-between;margin-top:4px;",
    },
    [createElement("span", { class: "badge" }, [place.category || "-"])]
  );

  return createElement(
    "div",
    { class: "place-card" },
    [
      createElement(
        "a",
        {
          href: `/place/${place.placeid}`,
          style: "text-decoration:none;color:inherit;display:block;",
        },
        [
          image,
          createElement("div", { class: "place-info" }, [
            metaRow,
            createElement("h2", {}, [place.name || "Unnamed Place"]),
            createElement("p", {}, [place.address || "-"]),
            createElement("p", {}, [place.short_desc || "-"]),
          ]),
        ]
      ),
    ]
  );
}