import { createCommonCropForm } from "./createOrEditCrop.ts";
import { apiFetch } from "../../../api/api.ts";
import Notify from "../../../components/ui/Notify.ts";
import { navigate } from "../../../routes/index.ts";

export async function createCrop(farmId, closeModal) {
    const wrapper = document.createElement("div");

    const form = createCommonCropForm({
        currentFarmName: farmId,
        isEdit: false,
        onSubmit: async (formData, submitBtn) => {
            submitBtn.disabled = true;

            try {
                await apiFetch(`/farms/farm/${farmId}/crops`, "POST", formData);

                Notify("✅ Crop created successfully.", {
                    type: "success",
                    duration: 3000
                });

                // close modal first
                closeModal?.();

                // refresh current view
                navigate(window.location.pathname);

            } catch (err) {
                wrapper.textContent = `❌ ${err.message}`;
            } finally {
                submitBtn.disabled = false;
            }
        }
    });

    wrapper.appendChild(form);
    return wrapper;
}