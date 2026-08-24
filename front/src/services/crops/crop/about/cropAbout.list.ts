import { createElement } from "../../../../components/createElement";
import { deleteCropAbout, getAllCropAbouts } from "./cropAbout.api";
import { displayCropForm } from "./cropAbout.form";
import type { CropAbout } from "./cropAbout.types";

export async function displayCropList(container: HTMLElement): Promise<void> {
    container.textContent = "";

    const crops = await getAllCropAbouts();
    const safeCrops = Array.isArray(crops) ? crops : [];

    const cards = safeCrops
        .filter((crop): crop is CropAbout => Boolean(crop))
        .map(crop =>
            createElement(
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
                                    if (!confirm("Delete crop?")) return;
                                    await deleteCropAbout(crop.id);
                                    displayCropList(container);
                                }
                            }
                        },
                        ["Delete"]
                    )
                ]
            ) as HTMLElement
        );

    const list = createElement("div", { class: "crop-list" }, cards);
    container.appendChild(list as HTMLElement);
}

export function createAdminActions(crop: CropAbout | null, container: HTMLElement): HTMLElement | null {
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
                            if (!confirm("Delete crop?")) return;
                            await deleteCropAbout(crop.id);
                            location.reload();
                        }
                    }
                },
                ["Delete Crop"]
            )
        ]
    ) as HTMLElement;
}