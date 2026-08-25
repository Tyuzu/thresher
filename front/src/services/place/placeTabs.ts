import "../../../css/subpages/accessiservice.css";
import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import Datex from "../../components/base/Datex.js";
import Modal from "../../components/ui/Modal.js";
import MultiSelect from "../../components/ui/MultiSelect.js";
import { apiFetch } from "../../api/api.js";

export interface PlaceData {
  placeid: string;
  category?: string;
  description?: string;
  capacity?: string | number;
  created_at: string | Date;
  updated_at: string | Date;
  accessibility_info?: string;
  amenities?: string[];
}

interface PlaceInfo {
  category: string;
  description: string;
  capacity: string | number;
  createdDate: string | Node;
  updatedDate: string | Node;
  accessibility: string[];
  services: string[];
}

// Predefined options
const defaultAccessibilityOptions: string[] = [
  "Wheelchair accessible",
  "Ramps available",
  "Elevator",
  "Visual aids",
  "Hearing assistance"
];

const defaultAmenitiesOptions: string[] = [
  "WiFi",
  "Parking",
  "Restrooms",
  "Air Conditioning",
  "Projector"
];

// ---------------------------------------
// MAIN EXPORT
// ---------------------------------------
function displayPlaceInfo(
  container: HTMLElement, 
  placeData: PlaceData, 
  isCreator: boolean
): void {
  container.replaceChildren();

  const info: PlaceInfo = {
    category: placeData.category || "N/A",
    description: placeData.description || "N/A",
    capacity: placeData.capacity ?? "N/A",
    createdDate: Datex(placeData.created_at) || "N/A",
    updatedDate: Datex(placeData.updated_at) || "N/A",
    accessibility: placeData.accessibility_info
      ? placeData.accessibility_info.split(",").map(s => s.trim())
      : [],
    services: Array.isArray(placeData.amenities) ? [...placeData.amenities] : []
  };

  // RENDER INFO PANEL
  const renderInfo = (): void => {
    container.replaceChildren();

    if (isCreator) {
      const editBtn = Button({
        title: "Edit Accessibility & Services",
        id: "edit-info-btn",
        classes: "buttonx",
        events: {
          click: handleEditInfo
        }
      });
      container.append(editBtn);
    }

    const infoDisplay = createElement("div", { class: "place-info" }, [
      row("Description", info.description),
      row("Category", info.category),
      row("Capacity", info.capacity),
      row("Created On", info.createdDate),
      row("Last Updated", info.updatedDate),
      row("Accessibility", info.accessibility.length ? info.accessibility.join(", ") : "Not specified"),
      row("Services", info.services.length ? info.services.join(", ") : "None")
    ]);

    container.append(infoDisplay);
  };

  // SIMPLE UTIL
  function row(label: string, val: string | number | Node): HTMLElement {
    return createElement("p", {}, [
      createElement("strong", {}, [`${label}: `]),
      createElement("span", {}, [val])
    ]);
  }

  // ---------------------------------------
  // HANDLE EDIT (OPEN MODAL)
  // ---------------------------------------
  const handleEditInfo = (): void => {
    const form = createElement("form", { class: "modal-form" });

    // Accessibility selector
    const accessibilityLabel = createElement("label", {}, ["Accessibility Info"]);

    const accessibilityMulti = MultiSelect({
      options: defaultAccessibilityOptions,
      selected: [...info.accessibility],
      placeholder: "Select accessibility features...",
      onChange: (sel: string[]) => {
        info.accessibility = sel;
      }
    });

    // Services selector
    const servicesLabel = createElement("label", {}, ["Services / Amenities"]);

    const servicesMulti = MultiSelect({
      options: defaultAmenitiesOptions,
      selected: [...info.services],
      placeholder: "Select services...",
      onChange: (sel: string[]) => {
        info.services = sel;
      }
    });

    // Buttons
    const saveBtn = Button({
      title: "Save",
      type: "submit",
      classes: "buttonx"
    });

    const cancelBtn = Button({
      title: "Cancel",
      classes: "buttonx"
    });

    form.append(
      accessibilityLabel,
      accessibilityMulti.element,
      servicesLabel,
      servicesMulti.element,
      saveBtn,
      cancelBtn
    );

    const { close } = Modal({
      title: "Edit Accessibility & Services",
      content: form,
      size: "medium"
    });

    const cleanupAndClose = (): void => {
      accessibilityMulti.destroy();
      servicesMulti.destroy();
      close();
    };

    cancelBtn.addEventListener("click", cleanupAndClose);

    form.addEventListener("submit", async (e: SubmitEvent) => {
      e.preventDefault();

      try {
        await apiFetch(`/places/place/${placeData.placeid}/info`, "PUT", {
          accessibility_info: info.accessibility.join(", "),
          amenities: info.services
        });
      } catch (err) {
        console.error("Update failed:", err);
      }

      cleanupAndClose();
      renderInfo();
    });
  };

  renderInfo();
}

export { displayPlaceInfo };