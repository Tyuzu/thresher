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
        "tulip", "lotus", "gerbera", "daisy", "dahlia", "orchid", "lily"
    ],
    spices: [
        "turmeric", "chili", "ginger", "cardamom", "cumin", "coriander-seed", "fennel",
        "mustard", "mustard-seed", "fenugreek", "clove", "black-pepper", "nutmeg", "cinnamon"
    ],
    oilseeds: [
        "sunflower-seed", "sesame", "groundnut", "soybean", "linseed", "mustard", "castor",
        "rapeseed"
    ],
    medicinal: [
        "ashwagandha", "giloy", "tulsi", "aloe-vera", "neem", "turmeric", "shatavari"
    ],
    others: [
        "fodder", "dried-leaves", "bamboo", "sugarcane", "tea", "coffee", "cotton",
        "hara-chara", "tooda"
    ]
} as const);

export type CropCategory = keyof typeof cropCategoryMap;
export type CropName = typeof cropCategoryMap[CropCategory][number];

// Internal pre-computed reverse index map for O(1) lookups
const reverseLookupIndex = new Map<string, CropCategory>();

for (const [category, itemArray] of Object.entries(cropCategoryMap)) {
    for (const cropName of itemArray) {
        if (!reverseLookupIndex.has(cropName)) {
            reverseLookupIndex.set(cropName, category as CropCategory);
        }
    }
}

/**
 * Finds the parent category key for a given crop name.
 *
 * @param cropName - Crop slug/name to query (e.g., "tomato").
 * @returns Category key or "others" if unmapped.
 */
export function getCategoryByCrop(cropName?: string | null): CropCategory {
    if (!cropName) return "others";
    const normalized = String(cropName).toLowerCase().trim();
    return reverseLookupIndex.get(normalized) || "others";
}

/**
 * Checks whether a specific crop belongs to a given category.
 *
 * @param cropName - Crop slug/name.
 * @param categoryKey - Category identifier.
 */
export function isCropInCategory(cropName?: string | null, categoryKey?: string | null): boolean {
    if (!cropName || !categoryKey) return false;
    
    const key = categoryKey.toLowerCase().trim() as CropCategory;
    const targetCategory = cropCategoryMap[key];
    if (!targetCategory) return false;

    const normalizedCrop = String(cropName).toLowerCase().trim();
    return (targetCategory as readonly string[]).includes(normalizedCrop);
}

/**
 * Retrieves a flattened list of all defined crop slugs across all categories.
 *
 * @returns Unique list of all mapped crops.
 */
export function getAllCrops(): string[] {
    return Array.from(reverseLookupIndex.keys());
}