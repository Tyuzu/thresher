import { createElement } from "../../../../components/createElement";
import { getCropAbout } from "./cropAbout.api";

import {
    createHeaderSection,
    createImageSection,
    createDescriptionSection,
    createNutritionalSection,
    createGrowingConditionsSection,
    createPlantingHarvestingSection,
    createCareSection,
    createVarietiesSection,
    createUsageSection,
    createFunFactsSection
} from "./cropAbout.helpers";
import { createAdminActions } from "./cropAbout.list";

export async function displayAboutCrop(
    contentContainer: HTMLElement, 
    cropID: string, 
    isLoggedIn: boolean
): Promise<void> {
    contentContainer.textContent = "";

    try {
        const crop = await getCropAbout(cropID);

        const sections = [
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
        ].filter((node): node is HTMLElement => Boolean(node));

        const wrapper = createElement("div", { class: "crop-about-wrapper" }, sections);
        contentContainer.appendChild(wrapper as HTMLElement);
    } catch {
        contentContainer.appendChild(
            createElement(
                "div",
                { class: "error-message" },
                ["Failed to load crop details."]
            ) as HTMLElement
        );
    }
}