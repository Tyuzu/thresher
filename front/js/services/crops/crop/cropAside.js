import { createElement } from "../../../components/createElement";
import Button from "../../../components/base/Button";
import { navigate } from "../../../routes";

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

  // 2. Deals & Featured Offers
  const dealsSection = createPromoBox("💸 Active Deals", [
    "🧃 Buy 2 kg Tomatoes, get 10% off!",
    "🥭 Fresh Mangoes now ₹40/kg!"
  ]);

  // 3. Seasonal Picks
  const seasonalSection = createPromoBox("📅 Seasonal Picks", [
    "🍉 Watermelons are ripe this week",
    "🌽 Baby corn harvest starting soon"
  ]);

  // 4. Market Trends
  const trendsSection = createPromoBox("📊 Crop Trends", [
    "📈 Onion prices up 12% this week",
    "📉 Cauliflower down due to surplus"
  ]);

  // 5. Announcements
  const announcementsSection = createPromoBox("🔔 Announcements", [
    "🛠 Maintenance scheduled this Friday",
    "🚚 New delivery zones added in Karnal"
  ]);

  // 6. Farmer Showcase
  const showcaseSection = createPromoBox("📷 Farmer's Showcase", [
    "🏞️ Featured: Ajay’s organic carrot patch",
    "🧑‍🌾 Share your crop stories with us!"
  ]);

  // return createElement("div", { class: "crop-aside-container" }, [
  //   actionsSection,
  //   dealsSection,
  //   seasonalSection,
  //   trendsSection,
  //   announcementsSection,
  //   showcaseSection
  // ]);
  
  return createElement("div", { class: "crop-aside-container" }, [
    actionsSection,
    dealsSection,
    seasonalSection,
    trendsSection,
    announcementsSection,
    showcaseSection
  ]);
}