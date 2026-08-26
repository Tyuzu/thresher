import { createCommonCropForm } from "./createOrEditCrop";
import Notify from "../../../components/ui/Notify";
import { navigate } from "../../../routes/navigate";
import { createCropForFarm } from "../api.js";

export type CloseModalCallback = () => void;

export async function createCrop(
    farmId: string, 
    closeModal?: CloseModalCallback
): Promise<HTMLDivElement> {
    const wrapper = document.createElement("div");

    const form = createCommonCropForm({
        currentFarmName: farmId,
        isEdit: false,
        onSubmit: async (formData: Record<string, unknown> | FormData, submitBtn: HTMLButtonElement): Promise<void> => {
            submitBtn.disabled = true;

            try {
                await createCropForFarm(farmId, formData);

                Notify("✅ Crop created successfully.", {
                    type: "success",
                    duration: 3000
                });

                // close modal first
                closeModal?.();

                // refresh current view
                navigate(window.location.pathname);

            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
                wrapper.textContent = `❌ ${errorMessage}`;
            } finally {
                submitBtn.disabled = false;
            }
        }
    });

    wrapper.appendChild(form);
    return wrapper;
}