import { createCommonCropForm } from "./createOrEditCrop.js";
import { apiFetch } from "../../../api/api.js";

export async function editCrop(farmId, crop, container) {
    const form = createCommonCropForm({
        crop,
        currentFarmName: farmId,
        isEdit: true,
        onSubmit: async (formData, submitBtn) => {
            submitBtn.disabled = true;
            try {
                const res = await apiFetch(`/farms/farm/${farmId}/crops/${crop.cropid}`, "PUT", formData);
                container.textContent = "✅ Crop updated successfully.";
            } catch (err) {
                container.textContent = `❌ ${err.message}`;
            } finally {
                submitBtn.disabled = false;
            }
        }
    });

    container.appendChild(form);
    return container;
}
