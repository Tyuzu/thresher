import { createElement } from "../../../components/createElement";
import { navigate } from "../../../routes/navigate";
import Notify from "../../../components/ui/Notify";

// --- Types & Interfaces ---

export interface CropData {
    name: string;
    [key: string]: unknown;
}

export type CategorizedCropsMap = Record<string, CropData[]>;

// --- Category Data ---

const normalizedCategoryMap: ReadonlyMap<string, string> = new Map([
    // Fruits
    ["mango", "fruits"], ["banana", "fruits"], ["apple", "fruits"], ["guava", "fruits"],
    ["papaya", "fruits"], ["orange", "fruits"], ["grapes", "fruits"], ["pineapple", "fruits"],
    ["litchi", "fruits"], ["watermelon", "fruits"], ["melon", "fruits"], ["lemon", "fruits"],
    ["strawberry", "fruits"], ["kiwi", "fruits"], ["coconut", "fruits"], ["peach", "fruits"],
    ["plum", "fruits"], ["fig", "fruits"], ["cherry", "fruits"], ["dragonfruit", "fruits"],
    ["custard-apple", "fruits"], ["pear", "fruits"],

    // Vegetables
    ["tomato", "vegetables"], ["onion", "vegetables"], ["potato", "vegetables"],
    ["spinach", "vegetables"], ["carrot", "vegetables"], ["cabbage", "vegetables"],
    ["cauliflower", "vegetables"], ["garlic", "vegetables"], ["radish", "vegetables"],
    ["cucumber", "vegetables"], ["pumpkin", "vegetables"], ["okra", "vegetables"],
    ["beetroot", "vegetables"], ["zucchini", "vegetables"], ["brinjal", "vegetables"],
    ["lettuce", "vegetables"], ["capsicum", "vegetables"], ["broccoli", "vegetables"],
    ["sweet-corn", "vegetables"], ["turnip", "vegetables"],

    // Legumes
    ["chickpea", "legumes"], ["lentil", "legumes"], ["pea", "legumes"],
    ["soybean", "legumes"], ["pigeon-pea", "legumes"], ["kidney-bean", "legumes"],
    ["black-gram", "legumes"], ["green-gram", "legumes"], ["cowpea", "legumes"],
    ["horse-gram", "legumes"], ["navy-bean", "legumes"], ["broad-bean", "legumes"],

    // Grains
    ["wheat", "grains"], ["rice", "grains"], ["corn", "grains"],
    ["barley", "grains"], ["oats", "grains"], ["sorghum", "grains"],
    ["millet", "grains"], ["quinoa", "grains"], ["rye", "grains"],
    ["bajra", "grains"], ["amaranth", "grains"], ["teff", "grains"],

    // Herbs
    ["mint", "herbs"], ["coriander", "herbs"], ["basil", "herbs"],
    ["parsley", "herbs"], ["rosemary", "herbs"], ["thyme", "herbs"],
    ["oregano", "herbs"], ["dill", "herbs"], ["lemongrass", "herbs"],
    ["sage", "herbs"], ["chives", "herbs"], ["bay-leaf", "herbs"],

    // Flowers
    ["rose", "flowers"], ["lily", "flowers"], ["marigold", "flowers"],
    ["jasmine", "flowers"], ["sunflower", "flowers"], ["hibiscus", "flowers"],
    ["lavender", "flowers"], ["chrysanthemum", "flowers"], ["tulip", "flowers"],
    ["lotus", "flowers"], ["gerbera", "flowers"], ["daisy", "flowers"],
    ["dahlia", "flowers"], ["orchid", "flowers"],

    // Spices
    ["turmeric", "spices"], ["chili", "spices"], ["ginger", "spices"],
    ["cardamom", "spices"], ["cumin", "spices"], ["coriander-seed", "spices"],
    ["fennel", "spices"], ["mustard-seed", "spices"], ["fenugreek", "spices"],
    ["clove", "spices"], ["black-pepper", "spices"], ["nutmeg", "spices"],
    ["cinnamon", "spices"],

    // Oilseeds
    ["sunflower-seed", "oilseeds"], ["sesame", "oilseeds"], ["groundnut", "oilseeds"],
    ["linseed", "oilseeds"], ["mustard", "oilseeds"], ["castor", "oilseeds"],
    ["rapeseed", "oilseeds"],

    // Medicinal
    ["ashwagandha", "medicinal"], ["giloy", "medicinal"], ["tulsi", "medicinal"],
    ["aloe-vera", "medicinal"], ["neem", "medicinal"], ["shatavari", "medicinal"],

    // Others
    ["hara-chara", "others"], ["tooda", "others"], ["fodder", "others"],
    ["dried-leaves", "others"], ["bamboo", "others"], ["sugarcane", "others"],
    ["tea", "others"], ["coffee", "others"], ["cotton", "others"]
]);

// --- Helper Functions ---

/**
 * Strips punctuation and normalizes string for matching.
 */
export function normalizeText(str: string): string {
    return str.toLowerCase().replace(/[^\w\s]/g, "").trim();
}

/**
 * Infers a crop's category from its name using keyword matching.
 */
export function guessCategoryFromName(name: string): string {
    const text = normalizeText(name);
    for (const [keyword, category] of normalizedCategoryMap.entries()) {
        if (text.includes(keyword)) {
            return category;
        }
    }
    return "others";
}

/**
 * Creates an anchor element that navigates to a crop detail page if present in data.
 */
export function createPromoLink(
    text: string,
    cropName: string,
    data: CategorizedCropsMap
): HTMLAnchorElement {
    const link = createElement(
        "a",
        { href: "#", class: "promo-link" },
        [text]
    ) as HTMLAnchorElement;

    link.onclick = (e: MouseEvent): void => {
        e.preventDefault();
        const found = Object.values(data)
            .flat()
            .find((c) => c.name.toLowerCase() === cropName.toLowerCase());

        if (found) {
            const cropSlug = cropName.toLowerCase().replace(/\s+/g, "_");
            navigate(`/crop/${cropSlug}`);
        } else {
            Notify(`Sorry, ${cropName} not found.`, { type: "info", dismissible: true });
        }
    };

    return link;
}