import Imagex from "../../../../components/base/Imagex";
import { createElement } from "../../../../components/createElement";
import type { GrowingConditions, NutritionalValue } from "./cropAbout.types";

export function splitLines(text: unknown): string[] {
    return String(text || "")
        .split("\n")
        .map(v => v.trim())
        .filter(Boolean);
}

export function createHeaderSection(common?: string, scientific?: string): HTMLElement {
    return createElement(
        "section",
        { class: "crop-header" },
        [
            createElement("h1", {}, [common || ""]),
            createElement(
                "h3",
                { class: "crop-scientific" },
                [scientific || ""]
            )
        ]
    ) as HTMLElement;
}

export function createImageSection(src?: string, alt?: string): HTMLElement {
    const img = Imagex({
        src: src || "/static/images/placeholder.png",
        alt: alt || "",
        clasess: "crop-main-image",
        loading: "lazy"
    });

    return createElement(
        "section",
        { class: "crop-image-section" },
        [img]
    ) as HTMLElement;
}

export function createDescriptionSection(description?: string): HTMLElement {
    return createElement(
        "section",
        { class: "crop-section" },
        [
            createElement("h2", {}, ["Description"]),
            createElement("p", {}, [description || ""])
        ]
    ) as HTMLElement;
}

export function createNutritionalSection(values: NutritionalValue[] = []): HTMLElement {
    return createElement(
        "section",
        { class: "crop-section" },
        [
            createElement("h2", {}, ["Nutritional Value"]),
            createElement(
                "ul",
                {},
                values.map(item =>
                    createElement(
                        "li",
                        {},
                        [`${item.label}: ${item.value}`]
                    )
                )
            )
        ]
    ) as HTMLElement;
}

export function createGrowingConditionsSection(conditions: Partial<GrowingConditions> = {}): HTMLElement {
    return createElement(
        "section",
        { class: "crop-section" },
        [
            createElement("h2", {}, ["Ideal Growing Conditions"]),
            createElement(
                "table",
                { class: "crop-table" },
                [
                    row("Soil", conditions.soil),
                    row("Sunlight", conditions.sunlight),
                    row("Water", conditions.water),
                    row("Temperature", conditions.temperature)
                ]
            )
        ]
    ) as HTMLElement;
}

export function createPlantingHarvestingSection(text?: string): HTMLElement {
    return createElement(
        "section",
        { class: "crop-section" },
        [
            createElement("h2", {}, ["Planting & Harvesting"]),
            createElement("p", {}, [text || ""])
        ]
    ) as HTMLElement;
}

export function createSimpleListSection(title: string, values: string[]): HTMLElement {
    return createElement(
        "section",
        { class: "crop-section" },
        [
            createElement("h2", {}, [title]),
            createElement(
                "ul",
                {},
                values.map(v =>
                    createElement(
                        "li",
                        {},
                        [v]
                    )
                )
            )
        ]
    ) as HTMLElement;
}

export function createCareSection(careTips: string[] = []): HTMLElement {
    return createSimpleListSection("Care & Maintenance", careTips);
}

export function createVarietiesSection(varieties: string[] = []): HTMLElement {
    return createSimpleListSection("Varieties", varieties);
}

export function createFunFactsSection(funFacts: string[] = []): HTMLElement {
    return createSimpleListSection("Fun Facts", funFacts);
}

export function createUsageSection(usage?: string): HTMLElement {
    return createElement(
        "section",
        { class: "crop-section" },
        [
            createElement("h2", {}, ["Usage"]),
            createElement("p", {}, [usage || ""])
        ]
    ) as HTMLElement;
}

export function row(label: string, value?: string): HTMLElement {
    return createElement(
        "tr",
        {},
        [
            createElement("th", {}, [label]),
            createElement("td", {}, [value || "-"])
        ]
    ) as HTMLElement;
}