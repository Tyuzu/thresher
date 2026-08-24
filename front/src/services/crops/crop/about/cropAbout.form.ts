import { createElement } from "../../../../components/createElement";
import { createCropAbout, updateCropAbout } from "./cropAbout.api";
import { splitLines } from "./cropAbout.helpers";
import type { CropAbout } from "./cropAbout.types";

export function displayCropForm(
    container: HTMLElement,
    crop: CropAbout | null = null
): void {
    container.textContent = "";

    const form = createElement(
        "form",
        { class: "crop-form" }
    ) as HTMLFormElement;

    form.innerHTML = `
        <input
            name="id"
            placeholder="Crop ID"
            value="${crop?.id || ""}"
            ${crop ? "disabled" : ""}
        />

        <input
            name="commonName"
            placeholder="Common Name"
            value="${crop?.commonName || ""}"
        />

        <input
            name="scientificName"
            placeholder="Scientific Name"
            value="${crop?.scientificName || ""}"
        />

        <input
            name="image"
            placeholder="Image URL"
            value="${crop?.image || ""}"
        />

        <input
            name="imageAlt"
            placeholder="Image Alt"
            value="${crop?.imageAlt || ""}"
        />

        <textarea
            name="description"
            placeholder="Description"
        >${crop?.description || ""}</textarea>

        <textarea
            name="plantingHarvesting"
            placeholder="Planting & Harvesting"
        >${crop?.plantingHarvesting || ""}</textarea>

        <textarea
            name="usage"
            placeholder="Usage"
        >${crop?.usage || ""}</textarea>

        <textarea
            name="careTips"
            placeholder="One tip per line"
        >${(crop?.careTips || []).join("\n")}</textarea>

        <textarea
            name="varieties"
            placeholder="One variety per line"
        >${(crop?.varieties || []).join("\n")}</textarea>

        <textarea
            name="funFacts"
            placeholder="One fact per line"
        >${(crop?.funFacts || []).join("\n")}</textarea>

        <button type="submit">
            ${crop ? "Update" : "Create"}
        </button>
    `;

    form.addEventListener("submit", async (e: SubmitEvent): Promise<void> => {
        e.preventDefault();

        const formData = new FormData(form);

        const payload: CropAbout = {
            id: String(formData.get("id") ?? ""),
            commonName: String(formData.get("commonName") ?? ""),
            scientificName: String(formData.get("scientificName") ?? ""),
            image: String(formData.get("image") ?? ""),
            imageAlt: String(formData.get("imageAlt") ?? ""),
            description: String(formData.get("description") ?? ""),
            plantingHarvesting: String(formData.get("plantingHarvesting") ?? ""),
            usage: String(formData.get("usage") ?? ""),
            nutritionalValues: crop?.nutritionalValues || [],
            growingConditions: crop?.growingConditions || {
                soil: "",
                sunlight: "",
                water: "",
                temperature: ""
            },
            careTips: splitLines(formData.get("careTips")),
            varieties: splitLines(formData.get("varieties")),
            funFacts: splitLines(formData.get("funFacts"))
        };

        try {
            if (crop) {
                await updateCropAbout(crop.id, payload);
            } else {
                await createCropAbout(payload);
            }

            alert("Saved");
        } catch {
            alert("Failed");
        }
    });

    container.appendChild(form);
}