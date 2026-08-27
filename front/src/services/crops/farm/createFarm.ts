import { apiFetch } from "../../../api/api.js";
import { navigate } from "../../../routes/navigate.js";
import { createFarmForm } from "./createOrEditFarm.js";

export interface FarmFormData {
  [key: string]: unknown;
}

export interface CreateFarmResponse {
  success: boolean;
  id?: string | number;
  message?: string;
}

/**
 * Renders the create farm interface into the provided container.
 *
 * @param isLoggedIn - Authentication state flag.
 * @param container - DOM element target where the form mounts.
 */
export function createFarm(isLoggedIn: boolean, container: HTMLElement | null): void {
  if (!container) return;

  container.textContent = "";

  if (!isLoggedIn) {
    container.textContent = "Please log in to create a farm.";
    return;
  }

  const form = createFarmForm({
    isEdit: false,
    onSubmit: async (formData: FormData | any): Promise<boolean | void> => {
      const res = await apiFetch<CreateFarmResponse>("/farms", "POST", formData as any);

      if (res?.success && res.id) {
        navigate(`/farm/${res.id}`);
        return true;
      } else {
        container.textContent = "❌ Failed to create farm. Please try again.";
        return false;
      }
    }
  });

  container.appendChild(form);
}