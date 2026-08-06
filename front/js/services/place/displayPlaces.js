import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import { navigate } from "../../routes/index.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import Imagex from "../../components/base/Imagex.js";
import { apiFetch } from "../../api/api.js";
import { adspace } from "../../services/ads/newads.js";
import { createMainLayout } from "../../components/layout/mainLayout.js";
import { createAsideContent } from "../../components/layout/asideLayout.js";

export async function displayPlaces(isLoggedIn, container) {
  container.replaceChildren();

  const PAGE_NAME = "places";

  // ---------- ACTIONS & SIDEBAR ----------
  const asideChildren = [];
  if (isLoggedIn) {
    asideChildren.push(
      Button("Create Place", "", { click: () => navigate("/create-place") }, "buttonx primary")
    );
  }

  asideChildren.push(
    Button("Create Itinerary", "", { click: () => navigate("/itinerary") }, "buttonx primary"),
    Button("Manage Places", "", { click: () => navigate("/places/manage") }, "buttonx secondary"),
    Button("Help / FAQ", "", { click: () => navigate("/help") }, "buttonx secondary")
  );

  // Sidebar Ad: 300x250 Medium Rectangle with 30s auto-refresh
  asideChildren.push(
    adspace("aside", PAGE_NAME, {
      width: 300,
      height: 250,
      refreshInterval: 30000
    })
  );

  const asideContent = createAsideContent({
    title: "Actions",
    children: asideChildren,
    showAd: false // Handled directly via asideChildren to prevent duplication
  });

  // ---------- MAIN HEADER & INBODY AD ----------
  const mainHeader = [
    createElement("h1", {}, ["All Places"]),
    adspace("inbody", PAGE_NAME, {
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