import { apiFetch } from "../../../api/api.js";
import { createElement } from "../../../components/createElement.js";
import Button from "../../../components/base/Button.js";
import { navigate } from "../../../routes/navigate.js";
import { addToCart, isValidCartQuantity } from "../../cart/addToCart.js";
import { getState } from "../../../state/state.js";
import { EntityType } from "../../../utils/imagePaths.js";
import Bannerx from "../../../components/base/Bannerx.js";

const MAX_CART_QUANTITY = 99;

export interface PriceHistory {
  date: string;
  price: number;
}

export interface AvailabilityDay {
  enabled?: boolean;
  from?: string;
  to?: string;
}

export type AvailabilitySchedule = Record<string, AvailabilityDay>;

export interface Crop {
  cropid?: string | number;
  name?: string;
  category?: string;
  price?: number;
  discount?: number;
  unit?: string;
  quantity?: number;
  harvestDate?: string;
  HarvestDate?: string;
  expiryDate?: string;
  banner?: string;
  history?: PriceHistory[];
  [key: string]: unknown;
}

export interface Farm {
  farmid?: string | number;
  name?: string;
  location?: string;
  description?: string;
  owner?: string;
  contact?: string;
  practice?: string;
  social?: string;
  updatedAt?: string;
  availability?: AvailabilitySchedule;
  crops?: Crop[];
  [key: string]: unknown;
}

export type SortCriterion = "name" | "price" | "quantity" | "age" | string;

// ─────────── Date utility ───────────
function getAgeInDays(dateStr?: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return 0;
  }
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// ─────────── Numeric utility ───────────
function getNumericValue(value: unknown): number {
  return typeof value === "number" && !isNaN(value) ? value : 0;
}

// ─────────── Availability Widget Helper ───────────
export function renderAvailabilityWidget(availability?: AvailabilitySchedule): HTMLElement | null {
  if (!availability) {
    return null;
  }

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const listItems: HTMLElement[] = [];

  for (const day of days) {
    const dayData = availability[day];
    if (dayData?.enabled) {
      const dayName = day.charAt(0).toUpperCase() + day.slice(1);
      listItems.push(
        createElement(
          "li",
          { class: "availability-item" },
          [
            createElement("span", { class: "day-name" }, [`${dayName}: `]),
            createElement("span", { class: "day-hours" }, [`${dayData.from || ""} - ${dayData.to || ""}`])
          ]
        ) as HTMLElement
      );
    }
  }

  if (listItems.length === 0) {
    return null;
  }

  return createElement(
    "div",
    { class: "availability-widget" },
    [
      createElement("strong", { class: "availability-title" }, ["🕒 Operating Hours"]),
      createElement("ul", { class: "availability-list" }, listItems)
    ]
  ) as HTMLElement;
}

// ─────────── Farm details ───────────
export function renderFarmDetails(
  farm: Farm = {},
  isCreator: boolean = false,
  onEditFarm: ((farm: Farm) => void) | null = null
): HTMLElement {
  const daysAgo = getAgeInDays(farm.updatedAt);
  const freshness =
    daysAgo < 2 ? "🟢 Updated today" : daysAgo < 7 ? "🟡 Updated this week" : `🔴 Updated ${daysAgo} days ago`;

  const actions: HTMLElement[] = [];

  if (isCreator) {
    actions.push(
      Button({
        title: "✏️ Edit",
        id: `edit-${farm.farmid}`,
        classes: "buttonx",
        events: {
          click: () => {
            if (typeof onEditFarm === "function") {
              onEditFarm(farm);
            }
          }
        }
      }),
      Button({
        title: "🗑️ Delete",
        id: `delete-${farm.farmid}`,
        classes: "buttonx",
        events: {
          click: async () => {
            const ok = window.confirm?.(`Delete farm "${farm.name}"?`);
            if (!ok) return;

            const res = await apiFetch<{ success: boolean }>(`/farms/farm/${farm.farmid}`, "DELETE");
            if (res?.success) {
              navigate("/farms");
            }
          }
        }
      })
    );
  }

  const detailChildren = [
    createElement("h2", {}, [farm.name || "Farm"]),
    createElement("p", {}, [`📍 Location: ${farm.location || "N/A"}`]),
    createElement("p", {}, [`📃 Description: ${farm.description || "N/A"}`]),
    createElement("p", {}, [`👤 Owner: ${farm.owner || "N/A"}`]),
    createElement("p", {}, [`📞 Contact: ${farm.contact || "N/A"}`]),
    farm.practice ? createElement("p", {}, [`🌱 Practice: ${farm.practice}`]) : null,
    renderAvailabilityWidget(farm.availability),
    farm.social
      ? createElement("p", {}, [
          "🔗 ",
          createElement(
            "a",
            {
              href: farm.social,
              target: "_blank",
              rel: "noopener noreferrer"
            },
            ["Visit farm page"]
          )
        ])
      : null,
    createElement("p", {}, [freshness]),
    actions.length ? createElement("div", { class: "farm-actions" }, actions) : null
  ].filter((child): child is HTMLElement => child !== null);

  return createElement("div", { class: "farm-detail" }, detailChildren) as HTMLElement;
}

// ─────────── Crop summary ───────────
export function renderCropSummary(crops: Crop[] = []): HTMLElement {
  const total = crops.length;
  const inStock = crops.filter((crop) => (crop?.quantity ?? 0) > 0).length;

  const getFinalPrice = (crop: Crop): number => {
    const original = getNumericValue(crop?.price);
    const discount = getNumericValue(crop?.discount);
    return original - (original * discount) / 100;
  };

  const avgPrice =
    total > 0
      ? (crops.reduce((sum, crop) => sum + getFinalPrice(crop), 0) / total).toFixed(2)
      : "0.00";

  return createElement(
    "div",
    { class: "crop-summary" },
    [
      createElement("p", {}, [`🌱 ${total} crops`]),
      createElement("p", {}, [`📦 ${inStock} in stock`]),
      createElement("p", {}, [`💸 Avg. Price: ₹${avgPrice}`])
    ]
  ) as HTMLElement;
}

// ─────────── Crop emoji distribution ───────────
export function renderCropEmojiMap(crops: Crop[] = []): HTMLElement {
  const emoji = ["🥔", "🌾", "🍅", "🌽", "🥬", "🍆", "🥕", "🌹"];
  const counts: Record<string, number> = {};

  for (const crop of crops) {
    const name = crop?.name || "Unknown";
    counts[name] = (counts[name] || 0) + 1;
  }

  const items = Object.entries(counts).map(([name, count], index) =>
    createElement("p", {}, [`${emoji[index % emoji.length]} ${name}: ${count}`])
  );

  return createElement(
    "div",
    { class: "crop-distribution" },
    [createElement("strong", {}, ["🗺️ Crop Distribution"]), ...items]
  ) as HTMLElement;
}

// ─────────── Sort dropdown ───────────
export function createSortDropdown(onChange: (val: string) => void = () => {}): HTMLSelectElement {
  const opts: [string, string][] = [
    ["name", "Sort by Name"],
    ["price", "Sort by Price"],
    ["quantity", "Sort by Quantity"],
    ["age", "Sort by Harvest Age"]
  ];

  const select = createElement(
    "select",
    { class: "crop-sort-select" },
    opts.map(([value, label]) => createElement("option", { value }, [label]))
  ) as HTMLSelectElement;

  select.addEventListener("change", () => onChange(select.value));

  return select;
}

// ─────────── Crop list ───────────
export async function renderCrops(
  farm: Farm = {},
  cropsContainer: HTMLElement | null,
  farmId: string | number,
  mainCon: HTMLElement,
  editcon: HTMLElement,
  isLoggedIn: boolean,
  sortBy: SortCriterion = "name",
  isCreator: boolean = false
): Promise<void> {
  if (!cropsContainer) {
    return;
  }

  cropsContainer.replaceChildren();

  if (!farm?.crops?.length) {
    cropsContainer.append(createElement("p", {}, ["No crops listed yet."]));
    return;
  }

  const sorted = sortCrops(farm.crops, sortBy);
  const fragment = document.createDocumentFragment();

  for (const crop of sorted) {
    fragment.append(
      createCropCard(crop, farm.name || "", farmId, mainCon, editcon, isLoggedIn, isCreator)
    );
  }

  cropsContainer.append(fragment);
}

// ─────────── Banner ───────────
function createCropBannerSection(crop: Crop, isCreator: boolean): HTMLElement {
  return Bannerx({
    isCreator,
    bannerkey: crop?.banner,
    banneraltkey: `Banner for ${crop?.name || "Crop"}`,
    bannerentitytype: EntityType.CROP,
    stateentitykey: "crop",
    bannerentityid: String(crop?.cropid || "")
  }) as HTMLElement;
}

// ─────────── Crop card ───────────
function createCropCard(
  crop: Crop,
  farmName: string,
  farmId: string | number,
  mainCon: HTMLElement,
  editcon: HTMLElement,
  isLoggedIn: boolean,
  isCreator: boolean
): HTMLElement {
  const harvestDate = crop?.HarvestDate || crop?.harvestDate;
  const harvestAge = harvestDate ? `${getAgeInDays(harvestDate)} days old` : "Unknown age";

  let expiryNotice: HTMLElement | null = null;

  if (crop?.expiryDate) {
    const daysUntilExpiry = -getAgeInDays(crop.expiryDate);

    if (daysUntilExpiry <= 0) {
      expiryNotice = createElement("span", { class: "badge badge-expired" }, ["⚠️ Expired"]) as HTMLElement;
    } else if (daysUntilExpiry <= 2) {
      expiryNotice = createElement(
        "span",
        { class: "badge badge-warning" },
        [`⚠️ Expires in ${daysUntilExpiry} days`]
      ) as HTMLElement;
    }
  }

  const originalVal = getNumericValue(crop?.price);
  const discountVal = getNumericValue(crop?.discount);
  const finalVal = discountVal > 0 ? originalVal - (originalVal * discountVal) / 100 : originalVal;

  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  });

  const priceElements: HTMLElement[] = [];

  if (discountVal > 0) {
    priceElements.push(
      createElement(
        "span",
        {
          class: "original-price-slashed",
          style: "text-decoration: line-through; color: #888; margin-right: 8px;"
        },
        [formatter.format(originalVal)]
      ) as HTMLElement,
      createElement(
        "strong",
        { class: "discounted-price" },
        [`${formatter.format(finalVal)} per ${crop?.unit || "unit"} `]
      ) as HTMLElement,
      createElement(
        "span",
        {
          class: "discount-badge",
          style:
            "background-color: #e1f7ec; color: #15803d; padding: 2px 6px; font-size: 11px; font-weight: bold; border-radius: 4px;"
        },
        [` ${discountVal}% OFF`]
      ) as HTMLElement
    );
  } else {
    priceElements.push(
      createElement("strong", {}, [`${formatter.format(originalVal)} per ${crop?.unit || "unit"}`]) as HTMLElement
    );
  }

  const controls = isCreator
    ? createCreatorControls(crop, farmId, editcon)
    : createUserControls(crop, farmName, farmId, isLoggedIn);

  const cardChildren = [
    createCropBannerSection(crop, isCreator),
    createElement(
      "div",
      { class: "crop-header" },
      [
        createElement(
          "h4",
          { style: "display: inline-block; margin-right: 8px;" },
          [crop?.name || "Crop"]
        ),
        crop?.category
          ? createElement(
              "span",
              {
                class: "badge-category",
                style:
                  "background: var(--color-fg); color: var(--color-bg); font-size: 11px; padding: 2px 8px; border-radius: 12px; text-transform: uppercase;"
              },
              [crop.category]
            )
          : null
      ].filter((child): child is HTMLElement => child !== null)
    ),
    createElement("p", { class: "price-display-wrapper" }, priceElements),
    createElement("p", {}, [`📦 Stock: ${crop?.quantity ?? 0} ${crop?.unit || ""}`]),
    createElement("p", {}, [`🕓 Harvested: ${harvestAge}`]),
    createElement("p", {}, [(crop?.quantity ?? 0) > 0 ? "✅ Available" : "❌ Out of Stock"]),
    expiryNotice,
    crop?.history && crop.history.length > 1 ? createPriceHistoryToggle(crop.history) : null,
    ...controls
  ].flat().filter((child): child is HTMLElement => child !== null);

  return createElement("div", { class: "crop-card" }, cardChildren) as HTMLElement;
}

// ─────────── Price history ───────────
function createPriceHistoryToggle(history: PriceHistory[]): HTMLElement {
  const block = createElement(
    "pre",
    { class: "price-history hidden" },
    [history.map((price) => `${price.date}: ₹${price.price}`).join("\n")]
  ) as HTMLElement;

  const toggle = Button({
    title: "📈 Show Price History",
    classes: "buttonx",
    events: {
      click: () => block.classList.toggle("hidden")
    }
  });

  return createElement("div", { class: "price-history-wrapper" }, [toggle, block]) as HTMLElement;
}

// ─────────── Creator controls ───────────
function createCreatorControls(
  crop: Crop,
  farmId: string | number,
  editcon: HTMLElement
): HTMLElement[] {
  return [
    Button({
      title: "✏️ Edit",
      classes: "buttonx",
      events: {
        click: () => {
          editcon.replaceChildren();
          if (typeof (window as unknown as { editCrop?: Function }).editCrop === "function") {
            (window as unknown as { editCrop: Function }).editCrop(farmId, crop, editcon);
          }
        }
      }
    }),
    Button({
      title: "🗑️ Delete",
      classes: "buttonx",
      events: {
        click: async () => {
          const ok = window.confirm?.(`Delete crop "${crop.name}"?`);
          if (!ok) return;

          const res = await apiFetch<{ success: boolean }>(
            `/farms/farm/${farmId}/crops/${crop.cropid}`,
            "DELETE"
          );

          if (res?.success) {
            editcon.replaceChildren(createElement("p", {}, ["❌ Crop deleted"]));
          }
        }
      }
    })
  ];
}

// ─────────── User controls ───────────
export function createUserControls(
  crop: Crop,
  _farmName: string,
  _farmId: string | number,
  _isLoggedIn: boolean
): HTMLElement[] {
  let quantity = 1;
  let isAddingToCart = false;

  const rawStock = Number(crop?.quantity ?? 0);
  const maxQty = Number.isFinite(rawStock) && rawStock > 0 ? Math.min(Math.floor(rawStock), MAX_CART_QUANTITY) : 0;

  const display = createElement(
    "span",
    {
      class: "quantity-display",
      "aria-live": "polite",
      "aria-label": "Selected quantity"
    },
    [String(quantity)]
  ) as HTMLElement;

  const updateUI = (): void => {
    display.textContent = String(quantity);
    (decBtn as HTMLButtonElement).disabled = isAddingToCart || quantity <= 1;
    (incBtn as HTMLButtonElement).disabled = isAddingToCart || maxQty < 1 || quantity >= maxQty;
    (addBtn as HTMLButtonElement).disabled = isAddingToCart || maxQty < 1;
  };

  const incBtn = Button({
    title: "+",
    classes: "buttonx subtle",
    events: {
      click: (event: Event) => {
        event.stopPropagation();
        if (isAddingToCart) return;

        if (quantity < maxQty) {
          quantity += 1;
          updateUI();
        }
      }
    }
  });

  const decBtn = Button({
    title: "−",
    classes: "buttonx subtle",
    events: {
      click: (event: Event) => {
        event.stopPropagation();
        if (isAddingToCart) return;

        if (quantity > 1) {
          quantity -= 1;
          updateUI();
        }
      }
    }
  });

  const addBtn = Button({
    title: "Add-To-Cart",
    id: "a2c-crop-crd",
    classes: "buttonx",
    events: {
      click: async (event: Event) => {
        event.stopPropagation();
        if (isAddingToCart) return;
        if (maxQty < 1) return;

        if (!isValidCartQuantity(quantity)) {
          console.error("Invalid cart quantity:", quantity);
          return;
        }

        if (quantity > maxQty) {
          quantity = maxQty;
          updateUI();
          return;
        }

        isAddingToCart = true;
        updateUI();

        try {
          const success = await addToCart({
            itemId: crop.cropid,
            quantity,
            isLoggedIn: Boolean(getState("token")),
            onCartUpdated: (response: unknown) => {
              console.debug("Crop added to cart:", response);
            }
          });

          if (!success) return;
        } catch (error) {
          console.error("Failed to add crop to cart:", error);
        } finally {
          isAddingToCart = false;
          updateUI();
        }
      }
    }
  });

  updateUI();

  const quantityRow = createElement("div", { class: "quantity-control" }, [
    decBtn,
    display,
    incBtn
  ]) as HTMLElement;

  return [
    createElement("label", {}, ["Quantity:"]) as HTMLElement,
    quantityRow,
    addBtn
  ];
}

// ─────────── Sorting ───────────
function sortCrops(crops: Crop[] = [], sortBy: SortCriterion = "name"): Crop[] {
  return [...crops].sort((a, b) => {
    switch (sortBy) {
      case "price":
        return getNumericValue(a?.price) - getNumericValue(b?.price);
      case "quantity":
        return getNumericValue(b?.quantity) - getNumericValue(a?.quantity);
      case "age":
        return (
          getAgeInDays(b?.HarvestDate || b?.harvestDate) -
          getAgeInDays(a?.HarvestDate || a?.harvestDate)
        );
      case "name":
      default:
        return (a?.name || "").localeCompare(b?.name || "");
    }
  });
}