import { apiFetch } from "../../../../api/api.js";

export async function getCropAbout(cropID) {
    const response = await apiFetch(`/crops/about/${cropID}`);
    return response.crop;
}

export async function getAllCropAbouts() {
    const response = await apiFetch("/crops/about");
    return response.crops || [];
}

export async function createCropAbout(crop) {
    return apiFetch("/crops/about", "POST", crop);
}

export async function updateCropAbout(cropID, crop) {
    return apiFetch(`/crops/about/${cropID}`, "PUT", crop);
}

export async function deleteCropAbout(cropID) {
    return apiFetch(`/crops/about/${cropID}`, "DELETE");
}