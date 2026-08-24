import Imagex from "../../../../components/base/Imagex.js";
import { createElement } from "../../../../components/createElement.js";

export function splitLines(text) {
    return String(text || "")
        .split("\n")
        .map(v => v.trim())
        .filter(Boolean);
}

export function createHeaderSection(common, scientific) {
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
    );
}

export function createImageSection(src, alt) {
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
    );
}

export function createDescriptionSection(description) {
    return createElement(
        "section",
        { class: "crop-section" },
        [
            createElement("h2", {}, ["Description"]),
            createElement("p", {}, [description || ""])
        ]
    );
}

export function createNutritionalSection(values = []) {
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
    );
}

export function createGrowingConditionsSection(conditions = {}) {
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
    );
}

export function createPlantingHarvestingSection(text) {
    return createElement(
        "section",
        { class: "crop-section" },
        [
            createElement("h2", {}, ["Planting & Harvesting"]),
            createElement("p", {}, [text || ""])
        ]
    );
}

export function createCareSection(careTips = []) {
    return createSimpleListSection("Care & Maintenance", careTips);
}

export function createVarietiesSection(varieties = []) {
    return createSimpleListSection("Varieties", varieties);
}

export function createFunFactsSection(funFacts = []) {
    return createSimpleListSection("Fun Facts", funFacts);
}

export function createUsageSection(usage) {
    return createElement(
        "section",
        { class: "crop-section" },
        [
            createElement("h2", {}, ["Usage"]),
            createElement("p", {}, [usage || ""])
        ]
    );
}

export function createSimpleListSection(title, values) {
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
    );
}

export function row(label, value) {
    return createElement(
        "tr",
        {},
        [
            createElement("th", {}, [label]),
            createElement("td", {}, [value || "-"])
        ]
    );
}