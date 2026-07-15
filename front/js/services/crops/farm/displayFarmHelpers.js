import { apiFetch } from "../../../api/api.js";
import { createElement } from "../../../components/createElement.js";
import { editCrop } from "../crop/editCrop.js";
import { navigate } from "../../../routes/index.js";
import { addToCart } from "../../cart/addToCart.js";
import { getState } from "../../../state/state.js";
import { EntityType } from "../../../utils/imagePaths.js";
import { editFarm } from "./editFarm.js";
import Bannerx from "../../../components/base/Bannerx.js";

// ─────────── Local button helper ───────────
function makeButton(title, id = "", onClick, classes = "", styles = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = title;

  if (id) {
    button.id = id;
  }

  if (classes) {
    button.className = classes;
  }

  button.classList.add("button");

  for (const [key, value] of Object.entries(styles)) {
    button.style[key] = value;
  }

  if (typeof onClick === "function") {
    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick(e);
    });
  }

  return button;
}

// ─────────── Availability Widget Helper ───────────
export function renderAvailabilityWidget(availability) {
  if (!availability) return null;

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const listItems = [];

  for (const day of days) {
    const dayData = availability[day];
    if (dayData && dayData.enabled) {
      const dayName = day.charAt(0).toUpperCase() + day.slice(1);
      listItems.push(
        createElement("li", { class: "availability-item" }, [
          createElement("span", { class: "day-name" }, [`${dayName}: `]),
          createElement("span", { class: "day-hours" }, [`${dayData.from} - ${dayData.to}`])
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
export function renderFarmDetails(farm, isCreator) {
  const daysAgo = getAgeInDays(farm.updatedAt);

  const freshness =
    daysAgo < 2
      ? "🟢 Updated today"
      : daysAgo < 7
        ? "🟡 Updated this week"
        : `🔴 Updated ${daysAgo} days ago`;

  const actions = document.createElement("div");
  actions.className = "farm-actions";

  if (isCreator) {
    actions.append(
      makeButton(
        "✏️ Edit",
        `edit-${farm.farmid}`,
        () => editFarm(true, farm),
        "buttonx"
      ),
      makeButton(
        "🗑️ Delete",
        `delete-${farm.farmid}`,
        async () => {
          const ok = window.confirm?.(`Delete farm "${farm.name}"?`);

          if (!ok) {
            return;
          }

          const res = await apiFetch(`/farms/farm/${farm.farmid}`, "DELETE");

          if (res?.success) {
            navigate("/farms");
          }
        },
        "buttonx"
      )
    );
  }

  return createElement("div", { class: "farm-detail" }, [
    createElement("h2", {}, [farm.name || "Farm"]),

    createElement("p", {}, [`📍 Location: ${farm.location || "N/A"}`]),

    createElement("p", {}, [`📃 Description: ${farm.description || "N/A"}`]),

    createElement("p", {}, [`👤 Owner: ${farm.owner || "N/A"}`]),

    createElement("p", {}, [`📞 Contact: ${farm.contact || "N/A"}`]),

    farm.practice &&
    createElement("p", {}, [`🌱 Practice: ${farm.practice}`]),

    // Render operational schedules dynamically
    renderAvailabilityWidget(farm.availability),

    farm.social &&
    createElement("p", {}, [
      "🔗 ",
      createElement(
        "a",
        {
          href: farm.social,
          target: "_blank",
          rel: "noopener"
        },
        ["Visit farm page"]
      )
    ]),

    createElement("p", {}, [freshness]),

    actions
  ].filter(Boolean));
}

// ─────────── Crop summary ───────────
export function renderCropSummary(crops) {
  const total = crops.length;
  const inStock = crops.filter((c) => c.quantity > 0).length;
  
  // Account for discounts in the average price calculation
  const getFinalPrice = (c) => {
    const orig = c.price || 0;
    const disc = c.discount || 0;
    return orig - (orig * disc / 100);
  };

  const avgPrice = (
    crops.reduce((sum, c) => sum + getFinalPrice(c), 0) / (total || 1)
  ).toFixed(2);

  return createElement("div", { class: "crop-summary" }, [
    createElement("p", {}, [`🌱 ${total} crops`]),
    createElement("p", {}, [`📦 ${inStock} in stock`]),
    createElement("p", {}, [`💸 Avg. Price: ₹${avgPrice}`])
  ]);
}

// ─────────── Crop emoji distribution ───────────
export function renderCropEmojiMap(crops) {
  const emoji = ["🥔", "🌾", "🍅", "🌽", "🥬", "🍆", "🥕", "🌹"];
  const counts = {};

  for (const c of crops) {
    const name = c.name || "Unknown";
    counts[name] = (counts[name] || 0) + 1;
  }

  return createElement("div", { class: "crop-distribution" }, [
    createElement("strong", {}, ["🗺️ Crop Distribution"]),
    ...Object.entries(counts).map(([name, cnt], i) =>
      createElement("p", {}, [`${emoji[i % emoji.length]} ${name}: ${cnt}`])
    )
  ]);
}

// ─────────── Sort dropdown ───────────
export function createSortDropdown(onChange) {
  const opts = [
    ["name", "Sort by Name"],
    ["price", "Sort by Price"],
    ["quantity", "Sort by Quantity"],
    ["age", "Sort by Harvest Age"]
  ];

  const select = createElement(
    "select",
    { class: "crop-sort-select" },
    opts.map(([val, label]) =>
      createElement("option", { value: val }, [label])
    )
  );

  select.addEventListener("change", () => onChange(select.value));
  return select;
}

// ─────────── Crop list ───────────
export async function renderCrops(
  farm,
  cropsContainer,
  farmId,
  mainCon,
  editcon,
  isLoggedIn,
  sortBy = "name",
  isCreator = false
) {
  cropsContainer.replaceChildren();

  if (!farm.crops?.length) {
    cropsContainer.append(createElement("p", {}, ["No crops listed yet."]));
    return;
  }

  const sorted = sortCrops(farm.crops, sortBy);

  for (const crop of sorted) {
    cropsContainer.append(
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
}

// ─────────── Banner ───────────
function createCropBannerSection(crop, isCreator) {
  return Bannerx({
    isCreator,
    bannerkey: crop.banner,
    banneraltkey: `Banner for ${crop.name || "Crop"}`,
    bannerentitytype: EntityType.CROP,
    stateentitykey: "crop",
    bannerentityid: String(crop.cropid)
  });
}

// ─────────── Crop card ───────────
function createCropCard(crop, farmName, farmId, mainCon, editcon, isLoggedIn, isCreator) {
  const card = createElement("div", { class: "crop-card" });

  // FIXED CASE-SENSITIVITY: crop.HarvestDate instead of crop.harvestDate
  const harvestAge =
    crop.HarvestDate
      ? `${getAgeInDays(crop.HarvestDate)} days old`
      : "Unknown age";

  // Calculate Expiry urgency
  let expiryNotice = null;
  if (crop.expiryDate) {
    const daysUntilExpiry = -getAgeInDays(crop.expiryDate);
    if (daysUntilExpiry <= 0) {
      expiryNotice = createElement("span", { class: "badge badge-expired" }, ["⚠️ Expired"]);
    } else if (daysUntilExpiry <= 2) {
      expiryNotice = createElement("span", { class: "badge badge-warning" }, [`⚠️ Expires in ${daysUntilExpiry} days`]);
    }
  }

  // Handle prices & discounts
  const originalVal = crop.price || 0;
  const discountVal = crop.discount || 0;
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
        `${formatter.format(finalVal)} per ${crop.unit || "unit"} `
      ]),
      createElement("span", { class: "discount-badge", style: "background-color: #e1f7ec; color: #15803d; padding: 2px 6px; font-size: 11px; font-weight: bold; border-radius: 4px;" }, [
        ` ${discountVal}% OFF`
      ])
    );
  } else {
    priceElements.push(
      createElement("strong", {}, [
        `${formatter.format(originalVal)} per ${crop.unit || "unit"}`
      ])
    );
  }

// Change the card append section at the end of createCropCard to this:
  card.append(
    ...[
      createCropBannerSection(crop, isCreator),
      createElement("div", { class: "crop-header" }, [
        createElement("h4", { style: "display: inline-block; margin-right: 8px;" }, [crop.name || "Crop"]),
        crop.category ? createElement("span", { class: "badge-category", style: "background: var(--color-fg);color:var(--color-bg); font-size: 11px; padding: 2px 8px; border-radius: 12px; text-transform: uppercase;" }, [crop.category]) : null
      ].filter(Boolean)),
      createElement("p", { class: "price-display-wrapper" }, priceElements),
      createElement("p", {}, [`📦 Stock: ${crop.quantity ?? 0} ${crop.unit || ""}`]),
      createElement("p", {}, [`🕓 Harvested: ${harvestAge}`]),
      createElement("p", {}, [
        crop.quantity > 0 ? "✅ Available" : "❌ Out of Stock"
      ]),
      expiryNotice // If null, it will be cleanly filtered out below!
    ].filter(Boolean)
  );

  if (crop.history?.length > 1) {
    card.append(...createPriceHistoryToggle(crop.history));
  }

  card.append(
    ...(isCreator
      ? createCreatorControls(crop, farmId, editcon)
      : createUserControls(crop, farmName, farmId, isLoggedIn))
  );

  return card;
}

// ─────────── Price history ───────────
function createPriceHistoryToggle(history) {
  const toggle = makeButton("📈 Show Price History", "", null, "buttonx");

  const block = document.createElement("pre");
  block.className = "price-history hidden";
  block.textContent = history.map((p) => `${p.date}: ₹${p.price}`).join("\n");

  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    block.classList.toggle("hidden");
  });

  return [toggle, block];
}

// ─────────── Creator controls ───────────
function createCreatorControls(crop, farmId, editcon) {
  return [
    makeButton("✏️ Edit", "", () => {
      editcon.replaceChildren();
      editCrop(farmId, crop, editcon);
    }, "buttonx"),
    makeButton("🗑️ Delete", "", async () => {
      const ok = window.confirm?.(`Delete crop "${crop.name}"?`);
      if (!ok) {
        return;
      }

      const res = await apiFetch(`/farms/farm/${farmId}/crops/${crop.cropid}`, "DELETE");

      if (res?.success) {
        editcon.replaceChildren(
          createElement("p", {}, ["❌ Crop deleted"])
        );
      }
    }, "buttonx")
  ];
}

// ─────────── User controls ───────────
export function createUserControls(crop, farmName, farmId, _isLoggedIn) {
  let quantity = 1;
  const maxQty = Number(crop.quantity ?? 0);

  const display = document.createElement("span");
  display.className = "quantity-display";
  display.textContent = String(quantity);

  const quantityRow = document.createElement("div");
  quantityRow.className = "quantity-control";

  const updateUI = (incBtn, decBtn, addBtn) => {
    display.textContent = String(quantity);
    decBtn.disabled = quantity <= 1;
    incBtn.disabled = maxQty < 1 || quantity >= maxQty;
    addBtn.disabled = maxQty < 1;
  };

  const inc = makeButton("+", "", null, "buttonx subtle");
  const dec = makeButton("−", "", null, "buttonx subtle");

  const addBtn = makeButton(
    "Add-To-Cart",
    "a2c-crop-crd",
    async () => {
      if (maxQty < 1) {
        return;
      }

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
    },
    "buttonx"
  );

  inc.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (quantity < maxQty) {
      quantity += 1;
      updateUI(inc, dec, addBtn);
    }
  });

  dec.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (quantity > 1) {
      quantity -= 1;
      updateUI(inc, dec, addBtn);
    }
  });

  updateUI(inc, dec, addBtn);

  quantityRow.append(dec, display, inc);

  return [
    createElement("label", {}, ["Quantity:"]),
    quantityRow,
    addBtn
  ];
}

// ─────────── Sorting ───────────
function sortCrops(crops, sortBy) {
  return [...crops].sort((a, b) => {
    switch (sortBy) {
      case "price":
        return understanding(a.price) - understanding(b.price);
      case "quantity":
        return (b.quantity || 0) - (a.quantity || 0);
      case "age":
        // Case safety fixed here too
        return getAgeInDays(b.HarvestDate) - getAgeInDays(a.HarvestDate);
      case "name":
      default:
        return (a.name || "").localeCompare(b.name || "");
    }
  });
}

function understanding(v) {
  return typeof v === "number" ? v : 0;
}

// ─────────── Date utility ───────────
function getAgeInDays(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return 0;
  }
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}