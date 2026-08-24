import { createElement } from "../../../../components/createElement.js";
import { deleteCropAbout, getAllCropAbouts } from "./cropAbout.api.js";
import { displayCropForm } from "./cropAbout.form.js";

export async function displayCropList(container) {
    container.textContent = "";

    const crops = await getAllCropAbouts();
    const safeCrops = Array.isArray(crops) ? crops : [];

    const list = createElement(
        "div",
        { class: "crop-list" },
        safeCrops.map(crop => {
            if (!crop) return null;

            return createElement(
                "div",
                { class: "crop-card" },
                [
                    createElement("h3", {}, [crop.commonName || "Unnamed Crop"]),
                    createElement("p", {}, [crop.scientificName || ""]),

                    createElement(
                        "button",
                        {
                            type: "button",
                            class: "btn btn-small btn-secondary",
                            events: {
                                click: () => displayCropForm(container, crop)
                            }
                        },
                        ["Edit"]
                    ),

                    createElement(
                        "button",
                        {
                            type: "button",
                            class: "btn btn-small btn-danger",
                            events: {
                                click: async () => {
                                    if (!confirm("Delete crop?")) {
                                        return;
                                    }

                                    await deleteCropAbout(crop.id);
                                    displayCropList(container);
                                }
                            }
                        },
                        ["Delete"]
                    )
                ]
            );
        }).filter(Boolean)
    );

    container.appendChild(list);
}

export function createAdminActions(crop, container) {
    if (!crop) return null;

    return createElement(
        "section",
        { class: "crop-admin-actions" },
        [
            createElement(
                "button",
                {
                    type: "button",
                    class: "btn btn-secondary",
                    events: {
                        click: () => displayCropForm(container, crop)
                    }
                },
                ["Edit Crop"]
            ),

            createElement(
                "button",
                {
                    type: "button",
                    class: "btn btn-danger",
                    events: {
                        click: async () => {
                            if (!confirm("Delete crop?")) {
                                return;
                            }

                            await deleteCropAbout(crop.id);
                            location.reload();
                        }
                    }
                },
                ["Delete Crop"]
            )
        ]
    );
}