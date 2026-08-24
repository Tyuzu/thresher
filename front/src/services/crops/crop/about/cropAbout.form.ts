import { createElement } from "../../../../components/createElement.js";
import {
    createCropAbout,
    updateCropAbout
} from "./cropAbout.api.js";
import { splitLines } from "./cropAbout.helpers.js";

export function displayCropForm(container, crop = null) {
    container.textContent = "";

    const form = createElement(
        "form",
        { class: "crop-form" }
    );

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

    form.addEventListener("submit", async e => {
        e.preventDefault();

        const formData = new FormData(form);

        const payload = {
            id: formData.get("id"),
            commonName: formData.get("commonName"),
            scientificName: formData.get("scientificName"),
            image: formData.get("image"),
            imageAlt: formData.get("imageAlt"),
            description: formData.get("description"),
            plantingHarvesting: formData.get("plantingHarvesting"),
            usage: formData.get("usage"),

            nutritionalValues: [],

            growingConditions: {
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