import { createElement } from "../../../../components/createElement.js";
import { deleteCropAbout, getAllCropAbouts } from "./cropAbout.api.js";
import { displayCropForm } from "./cropAbout.form.js";

export async function displayCropList(container) {
    container.textContent = "";

    const crops = await getAllCropAbouts();

    const list = createElement(
        "div",
        { class: "crop-list" },
        crops.map(crop =>
            createElement(
                "div",
                { class: "crop-card" },
                [
                    createElement("h3", {}, [crop.commonName]),
                    createElement("p", {}, [crop.scientificName]),

                    createElement(
                        "button",
                        {
                            onclick: () =>
                                displayCropForm(container, crop)
                        },
                        ["Edit"]
                    ),

                    createElement(
                        "button",
                        {
                            onclick: async () => {
                                if (!confirm("Delete crop?")) {
                                    return;
                                }

                                await deleteCropAbout(crop.id);
                                displayCropList(container);
                            }
                        },
                        ["Delete"]
                    )
                ]
            )
        )
    );

    container.appendChild(list);
}

export function createAdminActions(crop, container) {
    return createElement(
        "section",
        { class: "crop-admin-actions" },
        [
            createElement(
                "button",
                {
                    onclick: () =>
                        displayCropForm(container, crop)
                },
                ["Edit Crop"]
            ),

            createElement(
                "button",
                {
                    onclick: async () => {
                        if (!confirm("Delete crop?")) {
                            return;
                        }

                        await deleteCropAbout(crop.id);
                        location.reload();
                    }
                },
                ["Delete Crop"]
            )
        ]
    );
}