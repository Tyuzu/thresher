import { createElement } from "../../../components/createElement.js";
import { navigate } from "../../../routes/index.js";
import Button from "../../../components/base/Button.js";
import {
  resolveImagePath,
  PictureType,
  EntityType
} from "../../../utils/imagePaths.js";
import Imagex from "../../../components/base/Imagex.js";

// ---------- Farm Cards ----------

function renderFarmCards(farms, container, isLoggedIn, toggleFavorite) {
  const fragment = document.createDocumentFragment();

  for (const farm of farms) {
    fragment.appendChild(FarmCard(farm, isLoggedIn, toggleFavorite));
  }

  container.appendChild(fragment);
}

function FarmCard(farm, isLoggedIn = false, toggleFavorite = null) {
  const farmId = String(farm?.id || farm?.farmid || "");

  const img = Imagex({
    src: resolveImagePath(
      EntityType.FARM,
      PictureType.THUMB,
      farm?.photo
    ),
    alt: farm?.name || "Farm",
    classes: "farm__image"
  });

  const headerChildren = [
    createElement("h3", {}, [farm?.name || "Unnamed Farm"]),
    createElement("p", { class: "farm__location" }, [
      farm?.location || "Unknown location"
    ])
  ];

  if (isLoggedIn && typeof toggleFavorite === "function") {
    const isFav = farm?.isFavorite || false;
    const favButton = Button(
      isFav ? "❤️" : "🤍",
      `fav-${farmId}`,
      { click: () => toggleFavorite(farmId) },
      `farm__fav-btn ${isFav ? "is-favorite" : ""}`.trim()
    );
    headerChildren.unshift(favButton);
  }

  const header = createElement("div", { class: "farm__header" }, headerChildren);
  const badges = createFarmBadges(farm);

  const meta = createElement("div", { class: "farm__meta" }, [
    createElement("p", {}, [`Owner: ${farm?.owner || "N/A"}`]),
    createElement("p", {}, [farm?.description || "No description"])
  ]);

  const cropsSection = createElement(
    "div",
    { class: "farm__crops-preview" },
    [
      createElement("h4", {}, ["Crops"]),
      createCropList(farm?.crops)
    ]
  );

  const actions = createElement("div", { class: "farm__actions" }, [
    Button(
      "View",
      `farm-${farmId}`,
      { click: () => navigate(`/farm/${farmId}`) },
      "farm__button"
    )
  ]);

  return createElement("div", { class: "farm__card" }, [
    img,
    header,
    badges,
    meta,
    cropsSection,
    actions
  ]);
}

// ---------- Crops ----------

function createCropList(crops) {
  const items = Array.isArray(crops) ? crops.slice(0, 4) : [];

  const cropCards = items.map(crop => {
    const img = Imagex({
      src: resolveImagePath(
        EntityType.CROP,
        PictureType.THUMB,
        crop?.banner
      ),
      alt: crop?.name || "Crop",
      classes: "crop__image"
    });

    const infoChildren = [
      createElement("strong", {}, [crop?.name || "Unnamed"])
    ];

    if (crop?.outOfStock) {
      infoChildren.push(
        createElement("span", { class: "crop__badge out" }, ["Out of Stock"])
      );
    } else if (crop?.featured) {
      infoChildren.push(
        createElement("span", { class: "crop__badge featured" }, ["Featured"])
      );
    }

    const cropInfo = createElement(
      "div",
      { class: "crop__info" },
      infoChildren
    );

    return createElement("div", { class: "crop__card" }, [img, cropInfo]);
  });

  return createElement("div", { class: "crop__list" }, cropCards);
}

// ---------- Badges ----------

function createFarmBadges(farm) {
  const badges = [];

  if (farm?.organic) {
    badges.push(createElement("span", { class: "farm__badge" }, ["Organic"]));
  }
  if (farm?.delivers) {
    badges.push(createElement("span", { class: "farm__badge" }, ["Delivers"]));
  }
  if (farm?.hydroponic) {
    badges.push(createElement("span", { class: "farm__badge" }, ["Hydroponic"]));
  }

  return createElement("div", { class: "farm__badges" }, badges);
}

// ---------- Sidebar Sections ----------

function renderFeaturedFarm(container, farm) {
  if (!farm) return;

  const farmId = String(farm?.id || farm?.farmid || "");

  const section = createElement("section", { class: "farm__featured" }, [
    createElement("h3", {}, ["🌟 Featured Farm"]),
    Imagex({
      src: resolveImagePath(
        EntityType.FARM,
        PictureType.THUMB,
        farm?.photo
      ),
      alt: farm?.name || "Farm",
      classes: "farm__featured-photo"
    }),
    createElement("h4", {}, [farm?.name || "Unnamed Farm"]),
    createElement("p", {}, [farm?.location || "Unknown location"]),
    createElement("p", {}, [farm?.description || "No description provided."]),
    createElement("p", { class: "farm__featured-rating" }, [
      `⭐ ${typeof farm?.avgRating === "number" ? farm.avgRating.toFixed(1) : "N/A"} (${farm?.reviewCount || 0} reviews)`
    ]),
    Button(
      "View",
      `featured-${farmId}`,
      { click: () => navigate(`/farm/${farmId}`) },
      "farm__button"
    )
  ]);

  container.append(section);
}

function renderCTAFarm(container) {
  const section = createElement("section", { class: "farm__cta" }, [
    Button("Buy Tools", "buytools-crp-btn", {
      click: () => navigate("/tools")
    }, "buttonx"),
    Button("Chats", "chatss-frm-btn", {
      click: () => navigate("/merechats")
    }, "buttonx"),
    Button("Create Farm", "crt-frm-btn", {
      click: () => navigate("/create-farm")
    }, "buttonx")
  ]);

  container.append(section);
}

function renderWeatherWidget(container) {
  const section = createElement("section", { class: "farm__weather" }, [
    createElement("h3", {}, ["🌤 Weather"]),
    createElement("p", {}, ["Today: Sunny, 28°C"]),
    createElement("p", {}, ["Tomorrow: Light rain, 26°C"])
  ]);

  container.append(section);
}

function renderFarmStats(container, farms = []) {
  const locations = new Set();
  const crops = new Set();

  for (const farm of farms) {
    if (farm?.location) locations.add(farm.location);
    (farm?.crops || []).forEach(c => c?.name && crops.add(c.name));
  }

  const section = createElement("section", { class: "farm__stats" }, [
    createElement("h3", {}, ["📊 Farm Stats"]),
    createElement("p", {}, [`Total Farms: ${farms.length}`]),
    createElement("p", {}, [`Locations: ${locations.size}`]),
    createElement("p", {}, [`Unique Crops: ${crops.size}`])
  ]);

  container.append(section);
}

// ---------- Exports ----------

export {
  renderFarmCards,
  FarmCard,
  createCropList,
  createFarmBadges,
  renderFeaturedFarm,
  renderCTAFarm,
  renderWeatherWidget,
  renderFarmStats
};