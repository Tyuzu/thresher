import { createElement } from "../../../components/createElement.js";
import Button from "../../../components/base/Button.js";
import { navigate } from "../../../routes/index.js";
import { createAsideContent } from "../../../components/layout/asideLayout.js";

/**
 * Creates a standard promotional link/item box.
 */
function createPromoBox(title, items) {
  return createElement("section", { class: "aside-section promo-box" }, [
    createElement("h3", {}, [title]),
    createElement(
      "ul",
      { class: "promo-list" },
      items.map((item) => createElement("li", {}, [item]))
    )
  ]);
}

export function cropAside(_cropData) {
  // 1. Actions Section
  const actionsSection = createElement("section", { class: "aside-section" }, [
    createElement("h3", {}, ["Actions"]),
    createElement("div", { class: "cta-list" }, [
      Button("Buy Products", "buyprds-crp-btn", {
        click: () => navigate("/products")
      }, "action-btn buttonx primary"),

      Button("See Recipes", "recipes-crp-btn", {
        click: () => navigate("/recipes")
      }, "buttonx secondary"),

      Button("List Your Farm", "newfrm-btn", {
        click: () => navigate("/create-farm")
      }, "buttonx secondary")
    ])
  ]);

  // Promo sections
  const promoSections = [
    actionsSection,
    createPromoBox("💸 Active Deals", [
      "🧃 Buy 2 kg Tomatoes, get 10% off!",
      "🥭 Fresh Mangoes now ₹40/kg!"
    ]),
    createPromoBox("📅 Seasonal Picks", [
      "🍉 Watermelons are ripe this week",
      "🌽 Baby corn harvest starting soon"
    ]),
    createPromoBox("📊 Crop Trends", [
      "📈 Onion prices up 12% this week",
      "📉 Cauliflower down due to surplus"
    ]),
    createPromoBox("🔔 Announcements", [
      "🛠 Maintenance scheduled this Friday",
      "🚚 New delivery zones added in Karnal"
    ]),
    createPromoBox("📷 Farmer's Showcase", [
      "🏞️ Featured: Ajay’s organic carrot patch",
      "🧑‍🌾 Share your crop stories with us!"
    ])
  ];

  return createAsideContent({
    title: "Market Highlights",
    children: promoSections,
    showAd: false
  });
}