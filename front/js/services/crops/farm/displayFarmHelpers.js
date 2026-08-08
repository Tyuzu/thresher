import { apiFetch } from "../../../api/api.js";
import { createElement } from "../../../components/createElement.js";
import Button from "../../../components/base/Button.js";
import { editCrop } from "../crop/editCrop.js";
import { navigate } from "../../../routes/index.js";
import { addToCart } from "../../cart/addToCart.js";
import { getState } from "../../../state/state.js";
import { EntityType } from "../../../utils/imagePaths.js";
import { editFarm } from "./editFarm.js";
import Bannerx from "../../../components/base/Bannerx.js";

// ─────────── Date utility ───────────
function getAgeInDays(dateStr) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function getNumericValue(v) {
  return typeof v === "number" && !isNaN(v) ? v : 0;
}

// ─────────── Availability Widget Helper ───────────
export function renderAvailabilityWidget(availability) {
  if (!availability) return null;

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const listItems = [];

  for (const day of days) {
    const dayData = availability[day];
    if (dayData?.enabled) {
      const dayName = day.charAt(0).toUpperCase() + day.slice(1);
      listItems.push(
        createElement("li", { class: "availability-item" }, [
          createElement("span", { class: "day-name" }, [`${dayName}: `]),
          createElement("span", { class: "day-hours" }, [`${dayData.from || ""} - ${dayData.to || ""}`])
        ])
      );
    }
  }

  if (listItems.length === 0) return null;

  return createElement("div", { class: "availability-widget" }, [
    createElement("strong", { class: "availability-title" }, ["🕒 Operating Hours"]),
    createElement("ul", { class: "availability-list" }, listItems)
  ]);
}

// ─────────── Farm details ───────────
export function renderFarmDetails(farm = {}, isCreator = false) {
  const daysAgo = getAgeInDays(farm.updatedAt);

  const freshness =
    daysAgo < 2
      ? "🟢 Updated today"
      : daysAgo < 7
        ? "🟡 Updated this week"
        : `🔴 Updated ${daysAgo} days ago`;

  const actions = [];

  if (isCreator) {
    actions.push(
      Button(
        "✏️ Edit",
        `edit-${farm.farmid}`,
        { click: () => editFarm(true, farm) },
        "buttonx"
      ),
      Button(
        "🗑️ Delete",
        `delete-${farm.farmid}`,
        {
          click: async () => {
            const ok = window.confirm?.(`Delete farm "${farm.name}"?`);
            if (!ok) return;

            const res = await apiFetch(`/farms/farm/${farm.farmid}`, "DELETE");
            if (res?.success) navigate("/farms");
          }
        },
        "buttonx"
      )
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
          createElement("a", { href: farm.social, target: "_blank", rel: "noopener" }, ["Visit farm page"])
        ])
      : null,
    createElement("p", {}, [freshness]),
    actions.length ? createElement("div", { class: "farm-actions" }, actions) : null
  ].filter(Boolean);

  return createElement("div", { class: "farm-detail" }, detailChildren);
}

// ─────────── Crop summary ───────────
export function renderCropSummary(crops = []) {
  const total = crops.length;
  const inStock = crops.filter((c) => (c?.quantity ?? 0) > 0).length;

  const getFinalPrice = (c) => {
    const orig = getNumericValue(c?.price);
    const disc = getNumericValue(c?.discount);
    return orig - (orig * disc / 100);
  };

  const avgPrice = total > 0
    ? (crops.reduce((sum, c) => sum + getFinalPrice(c), 0) / total).toFixed(2)
    : "0.00";

  return createElement("div", { class: "crop-summary" }, [
    createElement("p", {}, [`🌱 ${total} crops`]),
    createElement("p", {}, [`📦 ${inStock} in stock`]),
    createElement("p", {}, [`💸 Avg. Price: ₹${avgPrice}`])
  ]);
}

// ─────────── Crop emoji distribution ───────────
export function renderCropEmojiMap(crops = []) {
  const emoji = ["🥔", "🌾", "🍅", "🌽", "🥬", "🍆", "🥕", "🌹"];
  const counts = {};

  for (const c of crops) {
    const name = c?.name || "Unknown";
    counts[name] = (counts[name] || 0) + 1;
  }

  const items = Object.entries(counts).map(([name, cnt], i) =>
    createElement("p", {}, [`${emoji[i % emoji.length]} ${name}: ${cnt}`])
  );

  return createElement("div", { class: "crop-distribution" }, [
    createElement("strong", {}, ["🗺️ Crop Distribution"]),
    ...items
  ]);
}

// ─────────── Sort dropdown ───────────
export function createSortDropdown(onChange = () => {}) {
  const opts = [
    ["name", "Sort by Name"],
    ["price", "Sort by Price"],
    ["quantity", "Sort by Quantity"],
    ["age", "Sort by Harvest Age"]
  ];

  const select = createElement(
    "select",
    { class: "crop-sort-select" },
    opts.map(([val, label]) => createElement("option", { value: val }, [label]))
  );

  select.addEventListener("change", () => onChange(select.value));
  return select;
}

// ─────────── Crop list ───────────
export async function renderCrops(
  farm = {},
  cropsContainer,
  farmId,
  mainCon,
  editcon,
  isLoggedIn,
  sortBy = "name",
  isCreator = false
) {
  if (!cropsContainer) return;
  cropsContainer.replaceChildren();

  if (!farm?.crops?.length) {
    cropsContainer.append(createElement("p", {}, ["No crops listed yet."]));
    return;
  }

  const sorted = sortCrops(farm.crops, sortBy);
  const fragment = document.createDocumentFragment();

  for (const crop of sorted) {
    fragment.append(
      createCropCard(
        crop,
        farm.name,
        farmId,
        mainCon,
        editcon,
        isLoggedIn,
        isCreator
      )
    );
  }

  cropsContainer.append(fragment);
}

// ─────────── Banner ───────────
function createCropBannerSection(crop, isCreator) {
  return Bannerx({
    isCreator,
    bannerkey: crop?.banner,
    banneraltkey: `Banner for ${crop?.name || "Crop"}`,
    bannerentitytype: EntityType.CROP,
    stateentitykey: "crop",
    bannerentityid: String(crop?.cropid || "")
  });
}

// ─────────── Crop card ───────────
function createCropCard(crop, farmName, farmId, mainCon, editcon, isLoggedIn, isCreator) {
  const harvestAge = crop?.HarvestDate || crop?.harvestDate
    ? `${getAgeInDays(crop.HarvestDate || crop.harvestDate)} days old`
    : "Unknown age";

  let expiryNotice = null;
  if (crop?.expiryDate) {
    const daysUntilExpiry = -getAgeInDays(crop.expiryDate);
    if (daysUntilExpiry <= 0) {
      expiryNotice = createElement("span", { class: "badge badge-expired" }, ["⚠️ Expired"]);
    } else if (daysUntilExpiry <= 2) {
      expiryNotice = createElement("span", { class: "badge badge-warning" }, [`⚠️ Expires in ${daysUntilExpiry} days`]);
    }
  }

  const originalVal = getNumericValue(crop?.price);
  const discountVal = getNumericValue(crop?.discount);
  const finalVal = discountVal > 0 ? originalVal - (originalVal * discountVal / 100) : originalVal;

  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  });

  const priceElements = [];
  if (discountVal > 0) {
    priceElements.push(
      createElement("span", { class: "original-price-slashed", style: "text-decoration: line-through; color: #888; margin-right: 8px;" }, [
        formatter.format(originalVal)
      ]),
      createElement("strong", { class: "discounted-price" }, [
        `${formatter.format(finalVal)} per ${crop?.unit || "unit"} `
      ]),
      createElement("span", { class: "discount-badge", style: "background-color: #e1f7ec; color: #15803d; padding: 2px 6px; font-size: 11px; font-weight: bold; border-radius: 4px;" }, [
        ` ${discountVal}% OFF`
      ])
    );
  } else {
    priceElements.push(
      createElement("strong", {}, [
        `${formatter.format(originalVal)} per ${crop?.unit || "unit"}`
      ])
    );
  }

  const controls = isCreator
    ? createCreatorControls(crop, farmId, editcon)
    : createUserControls(crop, farmName, farmId, isLoggedIn);

  const cardChildren = [
    createCropBannerSection(crop, isCreator),
    createElement("div", { class: "crop-header" }, [
      createElement("h4", { style: "display: inline-block; margin-right: 8px;" }, [crop?.name || "Crop"]),
      crop?.category ? createElement("span", { class: "badge-category", style: "background: var(--color-fg); color: var(--color-bg); font-size: 11px; padding: 2px 8px; border-radius: 12px; text-transform: uppercase;" }, [crop.category]) : null
    ].filter(Boolean)),
    createElement("p", { class: "price-display-wrapper" }, priceElements),
    createElement("p", {}, [`📦 Stock: ${crop?.quantity ?? 0} ${crop?.unit || ""}`]),
    createElement("p", {}, [`🕓 Harvested: ${harvestAge}`]),
    createElement("p", {}, [(crop?.quantity ?? 0) > 0 ? "✅ Available" : "❌ Out of Stock"]),
    expiryNotice,
    crop?.history?.length > 1 ? createPriceHistoryToggle(crop.history) : null,
    ...controls
  ].flat().filter(Boolean);

  return createElement("div", { class: "crop-card" }, cardChildren);
}

// ─────────── Price history ───────────
function createPriceHistoryToggle(history) {
  const block = createElement("pre", { class: "price-history hidden" }, [
    history.map((p) => `${p.date}: ₹${p.price}`).join("\n")
  ]);

  const toggle = Button(
    "📈 Show Price History",
    "",
    {
      click: () => block.classList.toggle("hidden")
    },
    "buttonx"
  );

  return createElement("div", { class: "price-history-wrapper" }, [toggle, block]);
}

// ─────────── Creator controls ───────────
function createCreatorControls(crop, farmId, editcon) {
  return [
    Button("✏️ Edit", "", {
      click: () => {
        editcon.replaceChildren();
        editCrop(farmId, crop, editcon);
      }
    }, "buttonx"),
    Button("🗑️ Delete", "", {
      click: async () => {
        const ok = window.confirm?.(`Delete crop "${crop.name}"?`);
        if (!ok) return;

        const res = await apiFetch(`/farms/farm/${farmId}/crops/${crop.cropid}`, "DELETE");
        if (res?.success) {
          editcon.replaceChildren(createElement("p", {}, ["❌ Crop deleted"]));
        }
      }
    }, "buttonx")
  ];
}

// ─────────── User controls ───────────
export function createUserControls(crop, farmName, farmId, _isLoggedIn) {
  let quantity = 1;
  const maxQty = Number(crop?.quantity ?? 0);

  const display = createElement("span", { class: "quantity-display" }, [String(quantity)]);

  const updateUI = () => {
    display.textContent = String(quantity);
    decBtn.disabled = quantity <= 1;
    incBtn.disabled = maxQty < 1 || quantity >= maxQty;
    addBtn.disabled = maxQty < 1;
  };

  const incBtn = Button("+", "", {
    click: () => {
      if (quantity < maxQty) {
        quantity += 1;
        updateUI();
      }
    }
  }, "buttonx subtle");

  const decBtn = Button("−", "", {
    click: () => {
      if (quantity > 1) {
        quantity -= 1;
        updateUI();
      }
    }
  }, "buttonx subtle");

  const addBtn = Button(
    "Add-To-Cart",
    "a2c-crop-crd",
    {
      click: async () => {
        if (maxQty < 1) return;

        await addToCart({
          itemId: crop.cropid,
          quantity,
          isLoggedIn: Boolean(getState("token")),
          itemType: "crop",
          itemName: crop.name,
          entityType: "farm",
          entityId: farmId,
          entityName: farmName
        });
      }
    },
    "buttonx"
  );

  updateUI();

  const quantityRow = createElement("div", { class: "quantity-control" }, [decBtn, display, incBtn]);

  return [
    createElement("label", {}, ["Quantity:"]),
    quantityRow,
    addBtn
  ];
}

// ─────────── Sorting ───────────
function sortCrops(crops = [], sortBy = "name") {
  return [...crops].sort((a, b) => {
    switch (sortBy) {
      case "price":
        return getNumericValue(a?.price) - getNumericValue(b?.price);
      case "quantity":
        return getNumericValue(b?.quantity) - getNumericValue(a?.quantity);
      case "age":
        return getAgeInDays(b?.HarvestDate || b?.harvestDate) - getAgeInDays(a?.HarvestDate || a?.harvestDate);
      case "name":
      default:
        return (a?.name || "").localeCompare(b?.name || "");
    }
  });
}