import { createElement } from "../../../../components/createElement.js";
import { getCropAbout } from "./cropAbout.api.js";
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
} from "./cropAbout.helpers.js";
import { createAdminActions } from "./cropAbout.list.js";

export async function displayAboutCrop(contentContainer, cropID, isLoggedIn) {
    contentContainer.textContent = "";

    try {
        const crop = await getCropAbout(cropID);

        const wrapper = createElement(
            "div",
            { class: "crop-about-wrapper" },
            [
                createHeaderSection(
                    crop.commonName,
                    crop.scientificName
                ),

                createImageSection(
                    crop.image,
                    crop.imageAlt
                ),

                createDescriptionSection(
                    crop.description
                ),

                createNutritionalSection(
                    crop.nutritionalValues
                ),

                createGrowingConditionsSection(
                    crop.growingConditions
                ),

                createPlantingHarvestingSection(
                    crop.plantingHarvesting
                ),

                createCareSection(
                    crop.careTips
                ),

                createVarietiesSection(
                    crop.varieties
                ),

                createUsageSection(
                    crop.usage
                ),

                createFunFactsSection(
                    crop.funFacts
                ),

                isLoggedIn
                    ? createAdminActions(
                        crop,
                        contentContainer
                    )
                    : null
            ].filter(Boolean)
        );

        contentContainer.appendChild(wrapper);
    } catch {
        contentContainer.appendChild(
            createElement(
                "div",
                { class: "error-message" },
                ["Failed to load crop details."]
            )
        );
    }
}