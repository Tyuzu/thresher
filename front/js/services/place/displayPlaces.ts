import { createElement } from "../../components/createElement.ts";
import { Button } from "../../components/base/Button.ts";
import { navigate } from "../../routes/navigate.ts";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.ts";
import Imagex from "../../components/base/Imagex.ts";
import { apiFetch } from "../../api/api.ts";
import { adspace } from "../../services/ads/newads.ts";
import { createMainLayout } from "../../components/layout/mainLayout.ts";
import { createAsideContent } from "../../components/layout/asideLayout.ts";

export async function displayPlaces(isLoggedIn, container) {
  container.replaceChildren();

  const PAGE_NAME = "places";

  // ---------- SIDEBAR SECTIONS ----------
  const actionButtons = [];
  if (isLoggedIn) {
    actionButtons.push(
      Button("Create Place", "", { click: () => navigate("/create-place") }, "buttonx primary")
    );
  }

  actionButtons.push(
    Button("Create Itinerary", "", { click: () => navigate("/itinerary") }, "buttonx primary"),
    Button("Manage Places", "", { click: () => navigate("/places/manage") }, "buttonx secondary"),
    Button("Help / FAQ", "", { click: () => navigate("/help") }, "buttonx secondary")
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

  const mainElement = layout.querySelector(".layout-main");
  const list = createElement("div", { class: "places-list" });

  // ---------- FETCH PLACES ----------
  let places = [];
  try {
    const resp = await apiFetch("/places/places?page=1&limit=100");
    places = Array.isArray(resp) ? resp : resp?.data || resp?.places || [];
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

  mainElement.append(list);
}

// ---------- CARD BUILDER ----------
function createPlaceCard(place) {
  const bannerUrl = place.banner
    ? resolveImagePath(EntityType.PLACE, PictureType.THUMB, place.banner)
    : resolveImagePath(EntityType.DEFAULT, PictureType.STATIC, "placeholder.png");

  const image = Imagex({
    src: bannerUrl,
    alt: `${place.name || "Unnamed"} Banner`,
    loading: "lazy",
  });

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