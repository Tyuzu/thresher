import { createElement } from "../../../components/createElement.js";
import { navigate } from "../../../routes/navigate.js";
import Button, { ButtonOptions } from "../../../components/base/Button.js";
import {
  resolveImagePath,
  PictureType,
  EntityType
} from "../../../utils/imagePaths.js";
import Imagex from "../../../components/base/Imagex.js";

// ---------- Interfaces ----------

export interface Crop {
  name?: string;
  banner?: string;
  outOfStock?: boolean;
  featured?: boolean;
  [key: string]: any;
}

export interface Farm {
  id?: string | number;
  farmid?: string | number;
  name?: string;
  photo?: string;
  location?: string;
  owner?: string;
  description?: string;
  avgRating?: number;
  reviewCount?: number;
  isFavorite?: boolean;
  organic?: boolean;
  delivers?: boolean;
  hydroponic?: boolean;
  crops?: Crop[];
  [key: string]: any;
}

export type ToggleFavoriteCallback = (farmId: string) => void;

// ---------- Farm Cards ----------

export function renderFarmCards(
  farms: Farm[],
  container: HTMLElement,
  isLoggedIn: boolean,
  toggleFavorite: ToggleFavoriteCallback | null
): void {
  const fragment = document.createDocumentFragment();

  for (const farm of farms) {
    fragment.appendChild(FarmCard(farm, isLoggedIn, toggleFavorite));
  }

  container.appendChild(fragment);
}

export function FarmCard(
  farm: Farm,
  isLoggedIn = false,
  toggleFavorite: ToggleFavoriteCallback | null = null
): HTMLElement {
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

  const headerChildren: HTMLElement[] = [
    createElement("h3", {}, [farm?.name || "Unnamed Farm"]) as HTMLElement,
    createElement("p", { class: "farm__location" }, [
      farm?.location || "Unknown location"
    ]) as HTMLElement
  ];

  if (isLoggedIn && typeof toggleFavorite === "function") {
    const isFav = farm?.isFavorite || false;
    const favButton = Button({
      title: isFav ? "❤️" : "🤍",
      id: `fav-${farmId}`,
      events: { click: () => toggleFavorite(farmId) },
      classes: `farm__fav-btn ${isFav ? "is-favorite" : ""}`.trim()
    });
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
    Button({
      title: "View",
      id: `farm-${farmId}`,
      events: { click: () => navigate(`/farm/${farmId}`) },
      classes: "farm__button"
    })
  ]);

  return createElement("div", { class: "farm__card" }, [
    img,
    header,
    badges,
    meta,
    cropsSection,
    actions
  ]) as HTMLElement;
}

// ---------- Crops ----------

export function createCropList(crops?: Crop[]): HTMLElement {
  const items = Array.isArray(crops) ? crops.slice(0, 4) : [];

  const cropCards = items.map((crop) => {
    const img = Imagex({
      src: resolveImagePath(
        EntityType.CROP,
        PictureType.THUMB,
        crop?.banner
      ),
      alt: crop?.name || "Crop",
      classes: "crop__image"
    });

    const infoChildren: HTMLElement[] = [
      createElement("strong", {}, [crop?.name || "Unnamed"]) as HTMLElement
    ];

    if (crop?.outOfStock) {
      infoChildren.push(
        createElement("span", { class: "crop__badge out" }, ["Out of Stock"]) as HTMLElement
      );
    } else if (crop?.featured) {
      infoChildren.push(
        createElement("span", { class: "crop__badge featured" }, ["Featured"]) as HTMLElement
      );
    }

    const cropInfo = createElement(
      "div",
      { class: "crop__info" },
      infoChildren
    );

    return createElement("div", { class: "crop__card" }, [img, cropInfo]);
  });

  return createElement("div", { class: "crop__list" }, cropCards) as HTMLElement;
}

// ---------- Badges ----------

export function createFarmBadges(farm?: Farm): HTMLElement {
  const badges: HTMLElement[] = [];

  if (farm?.organic) {
    badges.push(createElement("span", { class: "farm__badge" }, ["Organic"]) as HTMLElement);
  }
  if (farm?.delivers) {
    badges.push(createElement("span", { class: "farm__badge" }, ["Delivers"]) as HTMLElement);
  }
  if (farm?.hydroponic) {
    badges.push(createElement("span", { class: "farm__badge" }, ["Hydroponic"]) as HTMLElement);
  }

  return createElement("div", { class: "farm__badges" }, badges) as HTMLElement;
}

// ---------- Sidebar Sections ----------

export function renderFeaturedFarm(container: HTMLElement, farm?: Farm): void {
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
    Button({
      title: "View",
      id: `featured-${farmId}`,
      events: { click: () => navigate(`/farm/${farmId}`) },
      classes: "farm__button"
    })
  ]);

  container.append(section);
}

export function renderCTAFarm(container: HTMLElement): void {
  const section = createElement("section", { class: "farm__cta" }, [
    Button({
      title: "Buy Tools",
      id: "buytools-crp-btn",
      events: { click: () => navigate("/tools") },
      classes: "buttonx"
    }),
    Button({
      title: "Chats",
      id: "chatss-frm-btn",
      events: { click: () => navigate("/merechats") },
      classes: "buttonx"
    }),
    Button({
      title: "Create Farm",
      id: "crt-frm-btn",
      events: { click: () => navigate("/create-farm") },
      classes: "buttonx"
    })
  ]);

  container.append(section);
}

export function renderWeatherWidget(container: HTMLElement): void {
  const section = createElement("section", { class: "farm__weather" }, [
    createElement("h3", {}, ["🌤 Weather"]),
    createElement("p", {}, ["Today: Sunny, 28°C"]),
    createElement("p", {}, ["Tomorrow: Light rain, 26°C"])
  ]);

  container.append(section);
}

export function renderFarmStats(container: HTMLElement, farms: Farm[] = []): void {
  const locations = new Set<string>();
  const crops = new Set<string>();

  for (const farm of farms) {
    if (farm?.location) locations.add(farm.location);
    (farm?.crops || []).forEach((c) => c?.name && crops.add(c.name));
  }

  const section = createElement("section", { class: "farm__stats" }, [
    createElement("h3", {}, ["📊 Farm Stats"]),
    createElement("p", {}, [`Total Farms: ${farms.length}`]),
    createElement("p", {}, [`Locations: ${locations.size}`]),
    createElement("p", {}, [`Unique Crops: ${crops.size}`])
  ]);

  container.append(section);
}