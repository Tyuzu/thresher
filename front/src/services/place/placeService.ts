import Notify from "../../components/ui/Notify.js";
import { navigate } from "../../routes/navigate.js";
import displayPlace from "./displayPlace.js";
import { editPlaceForm, updatePlace, deletePlace } from "./editPlace.js";
import { createPlaceRequest, type CreatePlaceResponse } from "./api.js";

/**
 * Client-side validation of the FormData before sending to backend.
 * Throws error if validation fails.
 */
function validateFormData(formData: FormData): void {
  const requiredFields = ["name", "address", "description", "category", "capacity"];
  
  for (const key of requiredFields) {
    const value = formData.get(key);
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Field "${key}" is required.`);
    }
  }

  const capacityRaw = formData.get("capacity");
  const capacity = Number(capacityRaw);
  if (!Number.isInteger(capacity) || capacity <= 0) {
    throw new Error("Capacity must be a positive integer.");
  }

  const bannerFile = formData.get("banner");
  if (bannerFile instanceof File && bannerFile.size > 0) {
    if (bannerFile.size > 5 * 1024 * 1024) {
      throw new Error("Banner file must be smaller than 5MB.");
    }
    if (!bannerFile.type.startsWith("image/")) {
      throw new Error("Banner must be an image file.");
    }
  }
}

/**
 * Creates a place using FormData.
 */
async function createPlace(formData: FormData): Promise<CreatePlaceResponse> {
  try {
    validateFormData(formData);

    Notify("Creating place...", { type: "info", dismissible: true, duration: 3000 });
    
    const result = await createPlaceRequest(formData);

    Notify(`Place created successfully: ${result.name}`, { type: "success", dismissible: true, duration: 3000 });
    navigate('/place/' + result.placeid);
    
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error creating place";
    Notify(message, { type: "error", dismissible: true, duration: 3000 });
    console.error(error);
    throw error;
  }
}

export { createPlace, editPlaceForm, updatePlace, displayPlace, deletePlace };