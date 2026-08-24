import { apiFetch } from "../../../../api/api";
import type {
    CropAbout,
    CropAboutResponse,
    CreateCropAboutPayload,
    UpdateCropAboutPayload
} from "./cropAbout.types";

export async function getCropAbout(cropID: string): Promise<CropAbout> {
    const response = await apiFetch<CropAboutResponse>(`/crops/about/${cropID}`);
    return response.crop!;
}

export async function getAllCropAbouts(): Promise<CropAbout[]> {
    const response = await apiFetch<CropAboutResponse>("/crops/about");
    return response.crops || [];
}

export async function createCropAbout(crop: CreateCropAboutPayload): Promise<CropAboutResponse> {
    return apiFetch<CropAboutResponse>("/crops/about", "POST", crop);
}

export async function updateCropAbout(cropID: string, crop: UpdateCropAboutPayload): Promise<CropAboutResponse> {
    return apiFetch<CropAboutResponse>(`/crops/about/${cropID}`, "PUT", crop);
}

export async function deleteCropAbout(cropID: string): Promise<CropAboutResponse> {
    return apiFetch<CropAboutResponse>(`/crops/about/${cropID}`, "DELETE");
}