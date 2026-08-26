import { createElement } from "../../components/createElement.js";
import { getPlaceById, updatePlaceRequest, deletePlaceRequest } from "./api.js";
import { navigate } from "../../routes/navigate.js";
import Notify from "../../components/ui/Notify.js";
import { createFormGroup } from "../../components/form/createFormGroupEnhanced.js";
import { Place } from "./placeDetails.js";

type CategoryMap = Record<string, string[]>;

const categoryMap: CategoryMap = {
  "Food & Beverage": ["Restaurant", "Cafe", "Bakery"],
  "Health & Wellness": ["Hospital", "Clinic", "Gym", "Yoga Center"],
  "Entertainment": ["Theater", "Stadium", "Museum", "Arena"],
  "Services": ["Saloon", "Studio", "Petrol Pump", "Shop"],
  "Public Facilities": ["Toilet", "Park"],
  Business: ["Business", "Hotel", "Other"],
};

interface FormFieldConfig {
  label: string;
  type: string;
  id: string;
  value?: string | number;
  placeholder?: string;
  required?: boolean;
}

interface UpdatePlaceResponse {
  placeid: string;
  name: string;
  [key: string]: unknown;
}

async function editPlaceForm(
  isLoggedIn: boolean, 
  placeId: string, 
  content: HTMLElement
): Promise<void> {
  if (!isLoggedIn) {
    navigate("/login");
    return;
  }

  try {
    const place = await getPlaceById(placeId);
    content.innerHTML = "";

    const detectedMainCategory =
      Object.entries(categoryMap).find(([_, subs]) =>
        subs.includes(place.category || "")
      )?.[0] || "";

    const tags: string[] = Array.isArray(place.tags) ? [...place.tags] : [];

    const form = createElement("form", {
      id: "edit-place-form",
      events: {
        submit: async (event: Event) => {
          event.preventDefault();
          await updatePlace(isLoggedIn, placeId, tags);
        },
      },
    }) as HTMLFormElement;

    const mainCategoryGroup = createFormGroup({
      label: "Place Type",
      type: "select",
      id: "main-category",
      value: detectedMainCategory,
      required: true,
      options: Object.keys(categoryMap).map((cat) => ({
        value: cat,
        label: cat,
      })),
      events: {
        change: (e: Event) => {
          const target = e.target as HTMLSelectElement;
          const selected = target.value;
          const subSelect = form.querySelector("#category") as HTMLSelectElement | null;
          if (!subSelect) return;
          subSelect.innerHTML = "";
          (categoryMap[selected] || []).forEach((sub) => {
            const opt = createElement("option", { value: sub }, [sub]);
            subSelect.appendChild(opt);
          });
        },
      },
    } as any);
    form.appendChild(mainCategoryGroup);

    form.appendChild(
      createFormGroup({
        label: "Category",
        type: "select",
        id: "category",
        value: place.category,
        required: true,
        options: (categoryMap[detectedMainCategory] || []).map((sub) => ({
          value: sub,
          label: sub,
        })),
      })
    );

    const fields: FormFieldConfig[] = [
      {
        label: "Place Name",
        type: "text",
        id: "place-name",
        value: place.name,
        placeholder: "Place Name",
        required: true,
      },
      {
        label: "Description",
        type: "textarea",
        id: "place-description",
        value: place.description,
        placeholder: "Description",
        required: true,
      },
      {
        label: "Address",
        type: "text",
        id: "place-address",
        value: place.address,
        placeholder: "Address",
        required: true,
      },
      {
        label: "Capacity",
        type: "number",
        id: "capacity",
        value: place.capacity,
        placeholder: "Capacity",
        required: true,
      },
    ];
    fields.forEach((field) => form.appendChild(createFormGroup(field)));

    const tagInput = createElement("input", {
      type: "text",
      id: "tag-input",
      placeholder: "Add a tag",
    }) as HTMLInputElement;

    const tagList = createElement("div", {
      id: "tag-list",
      style: "margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;",
    });

    function renderTags(): void {
      tagList.replaceChildren();
      tags.forEach((tag, index) => {
        const chip = createElement(
          "span",
          {
            style:
              "padding:4px 8px;background:var(--color-space);border-radius:var(--radius-sm);display:inline-flex;align-items:center;gap:4px;",
          },
          [
            tag,
            createElement(
              "button",
              {
                type: "button",
                style: "border:none;background:none;cursor:pointer;color:red;",
                events: {
                  click: () => {
                    tags.splice(index, 1);
                    renderTags();
                  },
                },
              },
              ["×"]
            ),
          ]
        );
        tagList.appendChild(chip);
      });
    }

    const addTagBtn = createElement(
      "button",
      {
        type: "button",
        id: "add-tag-btn",
        events: {
          click: () => {
            const val = tagInput.value.trim();
            if (val && !tags.includes(val)) {
              tags.push(val);
              tagInput.value = "";
              renderTags();
            }
          },
        },
      },
      ["Add"]
    );

    const tagWrapper = createElement("div", { class: "form-group" }, [
      createElement("label", {}, ["Tags"]),
      createElement("div", { style: "display:flex;gap:8px;" }, [
        tagInput,
        addTagBtn,
      ]),
      tagList,
    ]);

    form.appendChild(tagWrapper);
    renderTags();

    const updateButton = createElement(
      "button",
      { type: "submit", class: "btn btn-primary" },
      ["Update Place"]
    );
    form.appendChild(updateButton);

    content.appendChild(createElement("h2", {}, ["Edit Place"]));
    content.appendChild(form);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    Notify(`Error loading place: ${message}`, {
      type: "warning",
      duration: 3000,
      dismissible: true,
    });
  }
}

async function updatePlace(
  isLoggedIn: boolean, 
  placeId: string, 
  tags: string[] = []
): Promise<void> {
  if (!isLoggedIn) {
    Notify("Please log in to update place.", {
      type: "warning",
      duration: 3000,
      dismissible: true,
    });
    return;
  }

  const nameEl = document.getElementById("place-name") as HTMLInputElement | null;
  const capacityEl = document.getElementById("capacity") as HTMLInputElement | null;
  const categoryEl = document.getElementById("category") as HTMLSelectElement | null;
  const addressEl = document.getElementById("place-address") as HTMLInputElement | null;
  const descriptionEl = document.getElementById("place-description") as HTMLTextAreaElement | null;

  const name = nameEl?.value.trim() || "";
  const capacity = capacityEl?.value || "";
  const category = categoryEl?.value || "";
  const address = addressEl?.value.trim() || "";
  const description = descriptionEl?.value.trim() || "";

  if (!name || !capacity || !category || !address || !description) {
    Notify("Please fill in all required fields.", {
      type: "warning",
      duration: 3000,
      dismissible: true,
    });
    return;
  }

  const formData = new FormData();
  formData.append("name", name);
  formData.append("capacity", capacity);
  formData.append("category", category);
  formData.append("address", address);
  formData.append("description", description);
  formData.append("tags", JSON.stringify(tags));

  try {
    const result = await updatePlaceRequest(placeId, formData);
    Notify(`Place updated successfully: ${result.name}`, {
      type: "success",
      duration: 3000,
      dismissible: true,
    });
    
    // Triggers router update safely without requiring displayPlace import
    navigate(`/place/${placeId}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    Notify(`Error updating place: ${message}`, {
      type: "error",
      duration: 3000,
      dismissible: true,
    });
  }
}

async function deletePlace(isLoggedIn: boolean, placeId: string): Promise<void> {
  if (!isLoggedIn) {
    Notify("Please log in to delete your place.", {
      type: "warning",
      duration: 3000,
      dismissible: true,
    });
    return;
  }
  if (confirm("Are you sure you want to delete this place?")) {
    try {
      await deletePlaceRequest(placeId);
      Notify("Place deleted successfully.", {
        type: "success",
        duration: 3000,
        dismissible: true,
      });
      navigate("/places");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      Notify(`Error deleting place: ${message}`, {
        type: "error",
        duration: 3000,
        dismissible: true,
      });
    }
  }
}

export { editPlaceForm, updatePlace, deletePlace };