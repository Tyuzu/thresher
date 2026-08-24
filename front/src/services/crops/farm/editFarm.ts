import { apiFetch } from "../../../api/api.js";
import { createFarmForm } from "./createOrEditFarm.js";

export function editFarm(isLoggedIn, farm, container, onSuccess = null) {
    container.textContent = "";

    if (!isLoggedIn) {
        container.textContent = "Please log in to edit this farm.";
        return;
    }

    const form = createFarmForm({
        isEdit: true,
        farm,
        onSubmit: async (formData) => {
            const res = await apiFetch(`/farms/farm/${farm.farmid}`, "PUT", formData, true);
            if (res.success) {
                if (typeof onSuccess === "function") {
                    onSuccess();
                }
            } else {
                container.textContent = "❌ Failed to update farm.";
            }
        }
    });

    container.appendChild(form);
}