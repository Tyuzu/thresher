import { createCommonCropForm, CreateCommonCropFormOptions } from "./createOrEditCrop";
import { apiFetch } from "../../../api/api";
import Notify from "../../../components/ui/Notify";

export interface Crop {
    cropid: string | number;
    name?: string;
    category?: string;
    breed?: string;
    pricePerKg?: number;
    availableQtyKg?: number;
    banner?: string;
    [key: string]: unknown;
}

export interface ApiResponse {
    success?: boolean;
    message?: string;
    [key: string]: unknown;
}

/**
 * Renders and attaches the edit crop form to a container element.
 */
export async function editCrop(
    farmId: string | number,
    crop: Crop,
    container: HTMLElement
): Promise<HTMLElement> {
    if (!crop?.cropid) {
        Notify("Invalid crop data provided for editing.", { type: "error", dismissible: true });
        return container;
    }

    const formOptions: CreateCommonCropFormOptions = {
        crop,
        currentFarmName: String(farmId),
        isEdit: true,
        onSubmit: async (formData: FormData, submitBtn: HTMLButtonElement): Promise<void> => {
            submitBtn.disabled = true;

            try {
                const response = await apiFetch<ApiResponse>(
                    `/farms/farm/${farmId}/crops/${crop.cropid}`,
                    "PUT",
                    formData
                );

                if (response?.success !== false) {
                    Notify("Crop updated successfully.", { type: "success", dismissible: true });
                } else {
                    throw new Error(response?.message || "Failed to update crop.");
                }
            } catch (err: unknown) {
                // apiFetch handles toast notification error logging
            } finally {
                submitBtn.disabled = false;
            }
        }
    };

    const form = createCommonCropForm(formOptions);
    container.replaceChildren(form);

    return container;
}

export default editCrop;