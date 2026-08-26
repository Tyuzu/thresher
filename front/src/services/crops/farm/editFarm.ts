import { createFarmForm } from "./createOrEditFarm.js";
import { updateFarm } from "../api.js";

// Define interface for the Farm object adjust properties as needed
export interface Farm {
    farmid?: string | number;
    name?: string;
    [key: string]: any;
}

// Interface for API response
interface ApiResponse {
    success: boolean;
    data?: any;
    error?: string;
}

type OnSuccessCallback = (() => void) | null;

export function editFarm(
    isLoggedIn: boolean,
    farm: Farm,
    container: HTMLElement,
    onSuccess: OnSuccessCallback = null
): void {
    container.textContent = "";

    if (!isLoggedIn) {
        container.textContent = "Please log in to edit this farm.";
        return;
    }

    const form: HTMLFormElement = createFarmForm({
        isEdit: true,
        farm,
        onSubmit: async (formData: Record<string, any> | FormData): Promise<void> => {
            const res: ApiResponse = await updateFarm(String(farm.farmid ?? ""), formData);

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