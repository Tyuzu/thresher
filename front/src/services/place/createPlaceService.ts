import { createElement } from "../../components/createElement.js";
import { navigate } from "../../routes/navigate.js";
import { createPlace } from "./placeService.js";
import Notify from "../../components/ui/Notify.js";
import { createFormGroup } from "../../components/form/createFormGroupEnhanced.js";

interface CategoryMap {
    [key: string]: string[];
}

interface FormOption {
    value: string;
    label: string;
}

interface FieldConfig {
    label: string;
    type: string;
    id: string;
    placeholder?: string;
    required?: boolean;
    additionalProps?: Record<string, unknown>;
}

const categoryMap: CategoryMap = {
    "Food & Beverage": ["Restaurant", "Cafe", "Bakery"],
    "Health & Wellness": ["Hospital", "Clinic", "Gym", "Yoga Center"],
    "Entertainment": ["Theater", "Stadium", "Museum", "Arena"],
    "Services": ["Saloon", "Studio", "Petrol Pump", "Shop"],
    "Public Facilities": ["Toilet", "Park"],
    "Business": ["Business", "Hotel", "Other"]
};

async function createPlaceForm(isLoggedIn: boolean, createSection: HTMLElement): Promise<void> {
    createSection.replaceChildren();

    if (!isLoggedIn) {
        Notify("You must be logged in to create a place.", { type: "warning", duration: 3000, dismissible: true });
        navigate('/login');
        return;
    }

    const form = createElement("form", { id: "create-place-form", enctype: "multipart/form-data" }) as HTMLFormElement;

    // Main category
    const mainCategoryOptions: FormOption[] = [
        { value: "", label: "Select main category" },
        ...Object.keys(categoryMap).map(key => ({ value: key, label: key }))
    ];

    form.appendChild(createFormGroup({
        label: "Place Type",
        type: "select",
        id: "main-category",
        required: true,
        options: mainCategoryOptions
    }));

    // Sub category
    form.appendChild(createFormGroup({
        label: "Category",
        type: "select",
        id: "category",
        required: true,
        options: [{ value: "", label: "Select sub category" }]
    }));

    // Standard Form fields
    const fields: FieldConfig[] = [
        { label: "Place Name", type: "text", id: "place-name", placeholder: "Place Name", required: true },
        { label: "Description", type: "textarea", id: "place-description", placeholder: "Description", required: true },
        { label: "Address", type: "text", id: "place-address", placeholder: "Address", required: true },
        { label: "City", type: "text", id: "place-city", placeholder: "City", required: true },
        { label: "Country", type: "text", id: "place-country", placeholder: "Country", required: true },
        { label: "Zip Code", type: "text", id: "place-zipcode", placeholder: "Zip Code", required: true },
        { label: "Capacity", type: "number", id: "capacity", placeholder: "Capacity", required: true, additionalProps: { min: 1 } },
        { label: "Phone Number", type: "text", id: "phone", placeholder: "Phone Number" },
        { label: "Place Image", type: "file", id: "place-image", additionalProps: { accept: "image/*" } }
    ];
    fields.forEach(field => form.appendChild(createFormGroup(field)));

    // Tags Section
    const tagWrapper = createElement("div", { class: "form-group" }, [
        createElement("label", {}, ["Tags"]),
        createElement("div", { style: "display:flex; gap:8px;" }, [
            createElement("input", { type: "text", id: "tag-input", placeholder: "Add a tag" }),
            createElement("button", { type: "button", id: "add-tag-btn" }, ["Add"])
        ]),
        createElement("div", { id: "tag-list", style: "margin-top:8px; display:flex; flex-wrap:wrap; gap:6px;" }, [])
    ]);
    form.appendChild(tagWrapper);

    const tags: string[] = [];
    const tagInput = tagWrapper.querySelector("#tag-input") as HTMLInputElement;
    const tagList = tagWrapper.querySelector("#tag-list") as HTMLDivElement;

    function renderTags(): void {
        tagList.replaceChildren();
        tags.forEach((tag, index) => {
            const chip = createElement("span", { 
                style: "padding:4px 8px; background:var(--color-space); border-radius:var(--radius-sm); display:inline-flex; align-items:center; gap:4px;" 
            }, [
                tag,
                createElement("button", { 
                    type: "button", 
                    style: "border:none; background:none; cursor:pointer; color:red;", 
                    onclick: () => { tags.splice(index, 1); renderTags(); } 
                }, ["×"])
            ]);
            tagList.appendChild(chip);
        });
    }

    const addTag = (): void => {
        const val = tagInput.value.trim();
        if (val && !tags.includes(val)) {
            tags.push(val);
            tagInput.value = "";
            renderTags();
        }
    };

    const addTagBtn = tagWrapper.querySelector("#add-tag-btn") as HTMLButtonElement;
    addTagBtn.addEventListener("click", addTag);
    
    // Prevent Enter inside tag input from triggering form submit
    tagInput.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addTag();
        }
    });

    // Subcategory dynamic populator
    const mainCategorySelect = form.querySelector("#main-category") as HTMLSelectElement;
    mainCategorySelect.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLSelectElement;
        const sub = form.querySelector("#category") as HTMLSelectElement;
        sub.replaceChildren(createElement("option", { value: "" }, ["Select sub category"]));
        
        const selected = categoryMap[target.value] || [];
        selected.forEach(subcat => {
            const option = createElement("option", { value: subcat }, [subcat]);
            sub.appendChild(option);
        });
    });

    // Submit handler
    form.addEventListener('submit', async (e: SubmitEvent) => {
        e.preventDefault();

        const formData = new FormData();

        const fieldMap: Record<string, string> = {
            "place-name": "name",
            "place-address": "address",
            "place-description": "description",
            "place-city": "city",
            "place-country": "country",
            "place-zipcode": "zipCode",
            "capacity": "capacity",
            "phone": "phone",
            "category": "category",
            "place-image": "image"
        };

        for (const [id, key] of Object.entries(fieldMap)) {
            const input = form.querySelector(`#${id}`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
            if (!input) continue;

            if (input instanceof HTMLInputElement && input.type === "file") {
                if (input.files && input.files[0]) {
                    formData.append(key, input.files[0]);
                }
            } else {
                formData.append(key, input.value.trim());
            }
        }

        // Send array values consistently
        tags.forEach(tag => formData.append("tags[]", tag));

        try {
            await createPlace(formData);
            Notify("Place created successfully!", { type: "success", duration: 3000 });
            navigate('/places');
        } catch (err) {
            Notify("Failed to create place. Try again.", { duration: 3000, type: "error" });
            console.error("Error creating place:", err);
        }
    });

    const submitButton = createElement("button", { type: "submit", class: "btn btn-primary" }, ["Create Place"]);
    form.appendChild(submitButton);

    createSection.appendChild(createElement('h2', {}, ["Create Place"]));
    createSection.appendChild(form);
}

export { createPlaceForm };