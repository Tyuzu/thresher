import Imagex from "../../../components/base/Imagex.js";
import { createElement } from "../../../components/createElement.js";
import { getCropAbout } from "./about/cropAbout.api.js";
import { createAdminActions } from "./about/cropAbout.list.js";
import type { GrowingConditions, NutritionalValue } from "./about/cropAbout.types.js";

export async function displayAboutCrop(
    contentContainer: HTMLElement,
    cropID: string,
    isLoggedIn: boolean
): Promise<void> {
    contentContainer.textContent = "";

    try {
        const crop = await getCropAbout(cropID);

        const sections: (HTMLElement | null)[] = [
            createHeaderSection(crop.commonName, crop.scientificName),
            createImageSection(crop.image, crop.imageAlt),
            createDescriptionSection(crop.description),
            createNutritionalSection(crop.nutritionalValues),
            createGrowingConditionsSection(crop.growingConditions),
            createPlantingHarvestingSection(crop.plantingHarvesting),
            createCareSection(crop.careTips),
            createVarietiesSection(crop.varieties),
            createUsageSection(crop.usage),
            createFunFactsSection(crop.funFacts),
            isLoggedIn ? createAdminActions(crop, contentContainer) : null
        ];

        // Filter out any potential null elements (e.g. non-logged-in admin actions)
        const validSections = sections.filter((node): node is HTMLElement => Boolean(node));

        const wrapper = createElement("div", { class: "crop-about-wrapper" }, validSections);
        contentContainer.appendChild(wrapper as HTMLElement);

    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load crop details.";
        const errorNode = createElement("div", { class: "error-message" }, [errorMessage]) as HTMLElement;
        contentContainer.appendChild(errorNode);
    }
}

function createHeaderSection(common?: string, scientific?: string): HTMLElement {
    return createElement("section", { class: "crop-header" }, [
        createElement("h1", {}, [common || ""]),
        createElement("h3", { class: "crop-scientific" }, [scientific || ""])
    ]) as HTMLElement;
}

function createImageSection(src?: string, alt?: string): HTMLElement {
    const img = Imagex({
        src: src || "/static/images/placeholder.png",
        alt: alt || "",
        clasess: "crop-main-image",
        loading: "lazy"
    });

    return createElement("section", { class: "crop-image-section" }, [img]) as HTMLElement;
}

function createDescriptionSection(description?: string): HTMLElement {
    return createElement("section", { class: "crop-section" }, [
        createElement("h2", {}, ["Description"]),
        createElement("p", {}, [description || ""])
    ]) as HTMLElement;
}

function createNutritionalSection(values: NutritionalValue[] = []): HTMLElement {
    const listItems = values.map(item => 
        createElement("li", {}, [`${item.label}: ${item.value}`])
    );

    return createElement("section", { class: "crop-section" }, [
        createElement("h2", {}, ["Nutritional Value"]),
        createElement("ul", {}, listItems)
    ]) as HTMLElement;
}

function createGrowingConditionsSection(conditions: Partial<GrowingConditions> = {}): HTMLElement {
    const table = createElement("table", { class: "crop-table" }, [
        createTableRow("Soil", conditions.soil),
        createTableRow("Sunlight", conditions.sunlight),
        createTableRow("Water", conditions.water),
        createTableRow("Temperature", conditions.temperature)
    ]);

    return createElement("section", { class: "crop-section" }, [
        createElement("h2", {}, ["Ideal Growing Conditions"]),
        table
    ]) as HTMLElement;
}

function createPlantingHarvestingSection(plantingHarvesting?: string): HTMLElement {
    return createElement("section", { class: "crop-section" }, [
        createElement("h2", {}, ["Planting & Harvesting"]),
        createElement("p", {}, [plantingHarvesting || ""])
    ]) as HTMLElement;
}

function createSimpleListSection(title: string, items: string[] = []): HTMLElement {
    const listItems = items.map(item => createElement("li", {}, [item]));

    return createElement("section", { class: "crop-section" }, [
        createElement("h2", {}, [title]),
        createElement("ul", {}, listItems)
    ]) as HTMLElement;
}

function createCareSection(careTips: string[] = []): HTMLElement {
    return createSimpleListSection("Care & Maintenance", careTips);
}

function createVarietiesSection(varieties: string[] = []): HTMLElement {
    return createSimpleListSection("Varieties", varieties);
}

function createFunFactsSection(funFacts: string[] = []): HTMLElement {
    return createSimpleListSection("Fun Facts", funFacts);
}

function createUsageSection(usage?: string): HTMLElement {
    return createElement("section", { class: "crop-section" }, [
        createElement("h2", {}, ["Usage"]),
        createElement("p", {}, [usage || ""])
    ]) as HTMLElement;
}

function createTableRow(label: string, value?: string): HTMLElement {
    return createElement("tr", {}, [
        createElement("th", {}, [label]),
        createElement("td", {}, [value || "-"])
    ]) as HTMLElement;
}