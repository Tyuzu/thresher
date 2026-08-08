/**
 * Core crop categorization map (Immutable).
 */
export const cropCategoryMap = Object.freeze({
  vegetables: [
    "tomato", "potato", "brinjal", "spinach", "carrot", "cabbage", "cauliflower",
    "onion", "garlic", "radish", "cucumber", "pumpkin", "okra", "beetroot", "zucchini",
    "lettuce", "capsicum", "broccoli", "sweet-corn", "turnip"
  ],
  fruits: [
    "mango", "banana", "guava", "papaya", "apple", "orange", "pomegranate",
    "grapes", "pineapple", "litchi", "watermelon", "melon", "lemon", "strawberry",
    "kiwi", "coconut", "peach", "plum", "fig", "cherry", "dragonfruit", "custard-apple", "pear"
  ],
  grains: [
    "wheat", "rice", "corn", "barley", "oats", "sorghum", "millet", "quinoa",
    "rye", "bajra", "amaranth", "teff"
  ],
  legumes: [
    "chickpea", "lentil", "pea", "soybean", "pigeon-pea", "kidney-bean", "black-gram",
    "green-gram", "cowpea", "horse-gram", "navy-bean", "broad-bean"
  ],
  herbs: [
    "mint", "coriander", "basil", "parsley", "rosemary", "thyme", "oregano", "dill", "lemongrass",
    "sage", "chives", "bay-leaf"
  ],
  flowers: [
    "marigold", "rose", "jasmine", "sunflower", "hibiscus", "lavender", "chrysanthemum",
    "tulip", "lotus", "gerbera", "daisy", "dahlia", "orchid"
  ],
  spices: [
    "turmeric", "chili", "ginger", "cardamom", "cumin", "coriander-seed", "fennel",
    "mustard", "fenugreek", "clove", "black-pepper", "nutmeg", "cinnamon"
  ],
  oilseeds: [
    "sunflower-seed", "sesame", "groundnut", "soybean", "linseed", "mustard", "castor",
    "rapeseed"
  ],
  medicinal: [
    "ashwagandha", "giloy", "tulsi", "aloe-vera", "neem", "turmeric", "shatavari"
  ],
  others: [
    "fodder", "dried-leaves", "bamboo", "sugarcane", "tea", "coffee", "cotton"
  ]
});

// Internal pre-computed reverse index map for O(1) lookups
const reverseLookupIndex = new Map();

for (const [category, itemArray] of Object.entries(cropCategoryMap)) {
  for (const cropName of itemArray) {
    if (!reverseLookupIndex.has(cropName)) {
      reverseLookupIndex.set(cropName, category);
    }
  }
}

/**
 * Finds the parent category key for a given crop name.
 *
 * @param {string} cropName - Crop slug/name to query (e.g., "tomato").
 * @returns {string} Category key or "others" if unmapped.
 */
export function getCategoryByCrop(cropName) {
  if (!cropName) return "others";
  const normalized = String(cropName).toLowerCase().trim();
  return reverseLookupIndex.get(normalized) || "others";
}

/**
 * Checks whether a specific crop belongs to a given category.
 *
 * @param {string} cropName - Crop slug/name.
 * @param {string} categoryKey - Category identifier.
 * @returns {boolean}
 */
export function isCropInCategory(cropName, categoryKey) {
  if (!cropName || !categoryKey) return false;
  const targetCategory = cropCategoryMap[categoryKey.toLowerCase()];
  if (!targetCategory) return false;
  return targetCategory.includes(String(cropName).toLowerCase().trim());
}

/**
 * Retrieves a flattened list of all defined crop slugs across all categories.
 *
 * @returns {Array<string>} Unique list of all mapped crops.
 */
export function getAllCrops() {
  return Array.from(reverseLookupIndex.keys());
}