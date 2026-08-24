import { createElement } from "../../../components/createElement";
import { createFormGroup } from "../../../components/form/createFormGroupEnhanced";
import { cropCategoryMap } from "./cropCategories";

export interface CropData {
    name?: string;
    price?: number | string;
    discount?: number | string;
    quantity?: number | string;
    unit?: string;
    notes?: string;
    harvestDate?: string;
    expiryDate?: string;
    featured?: boolean;
    outOfStock?: boolean;
}

export interface CreateCommonCropFormOptions {
    crop?: CropData;
    currentFarmName?: string;
    isEdit?: boolean;
    onSubmit: (formData: FormData, submitBtn: HTMLButtonElement) => void;
}

// Backwards-compatibility alias
export type CommonCropFormOptions = CreateCommonCropFormOptions;

// Helper type for category indexing
type CropCategoryKey = keyof typeof cropCategoryMap;

export function createCommonCropForm({
    crop = {},
    currentFarmName = "",
    isEdit = false,
    onSubmit
}: CreateCommonCropFormOptions): HTMLFormElement {
    const form = createElement("form", {
        class: isEdit ? "crop-edit-form create-section" : "crop-create-form create-section"
    }) as HTMLFormElement;

    const h20 = createElement("h2", {}, [isEdit ? "Edit Crop" : "Create Crop"]);
    form.appendChild(h20);

    let preCategory = "";
    if (crop.name) {
        for (const [cat, crops] of Object.entries(cropCategoryMap)) {
            const cropList = crops as readonly string[];
            if (cropList.includes(crop.name)) {
                preCategory = cat;
                break;
            }
        }
    }

    const categoryGroup = createFormGroup({
        label: "Category",
        type: "select",
        id: "crop-category",
        name: "category",
        required: true,
        placeholder: "Select Category",
        options: Object.keys(cropCategoryMap).map(c => ({ value: c, label: c })),
        value: preCategory
    });

    const cropGroup = createFormGroup({
        label: "Crop",
        type: "select",
        id: "crop-name",
        name: "name",
        required: true,
        placeholder: "Select Crop",
        options: [],
        value: crop.name || ""
    });

    const priceGroup = createFormGroup({
        label: "Price",
        type: "number",
        id: "crop-price",
        name: "price",
        placeholder: "price",
        value: crop.price ?? "",
        required: true,
        additionalProps: { step: "0.01" }
    });

    const discountGroup = createFormGroup({
        label: "Discount (%)",
        type: "number",
        id: "crop-discount",
        name: "discount",
        placeholder: "e.g. 10",
        value: crop.discount ?? "",
        additionalProps: { step: "0.01", min: "0", max: "100" }
    });

    const quantityGroup = createFormGroup({
        label: "Quantity",
        type: "number",
        id: "crop-quantity",
        name: "quantity",
        placeholder: "quantity",
        value: crop.quantity ?? "",
        required: true
    });

    const unitGroup = createFormGroup({
        label: "Unit",
        type: "select",
        id: "crop-unit",
        name: "unit",
        required: true,
        options: ["kg", "liters", "dozen", "units"].map(u => ({ value: u, label: u })),
        value: crop.unit || ""
    });

    const notesGroup = createFormGroup({
        label: "Notes",
        type: "textarea",
        id: "crop-notes",
        placeholder: "Notes",
        name: "notes",
        value: crop.notes || ""
    });

    const harvestGroup = createFormGroup({
        label: "Harvest Date",
        type: "date",
        id: "crop-harvest",
        name: "harvestDate",
        value: crop.harvestDate?.split("T")[0] || ""
    });

    const expiryGroup = createFormGroup({
        label: "Expiry Date",
        type: "date",
        id: "crop-expiry",
        name: "expiryDate",
        value: crop.expiryDate?.split("T")[0] || ""
    });

    const featuredGroup = createFormGroup({
        label: "Featured",
        type: "checkbox",
        id: "crop-featured",
        name: "featured",
        value: crop.featured || false
    });

    const outOfStockGroup = createFormGroup({
        label: "Out of Stock",
        type: "checkbox",
        id: "crop-outofstock",
        name: "outOfStock",
        value: crop.outOfStock || false
    });

    const fields: HTMLElement[] = [
        categoryGroup, cropGroup, priceGroup, discountGroup, quantityGroup, unitGroup,
        notesGroup, harvestGroup, expiryGroup, featuredGroup, outOfStockGroup
    ];

    if (!isEdit && currentFarmName) {
        const farmInput = createElement("input", { type: "hidden", name: "farmName", value: currentFarmName }) as HTMLElement;
        fields.push(farmInput);
    }

    fields.forEach(f => form.appendChild(f));

    // Submit button
    const submitBtn = createElement("button", { type: "submit" }, [isEdit ? "Save Changes" : "Add Crop"]) as HTMLButtonElement;
    form.appendChild(submitBtn);

    // Dynamic crop population
    const categorySelect = categoryGroup.querySelector<HTMLSelectElement>("select");
    const cropSelect = cropGroup.querySelector<HTMLSelectElement>("select");

    function populateCrops(category: string): void {
        if (!cropSelect) return;
        
        cropSelect.innerHTML = '<option value="">Select Crop</option>';
        const crops = cropCategoryMap[category as CropCategoryKey] as readonly string[] | undefined;
        if (!crops) {
            cropSelect.disabled = true;
            return;
        }
        crops.forEach((c: string) => {
            const option = createElement("option", { value: c, selected: c === crop.name }, [c]);
            cropSelect.appendChild(option);
        });
        cropSelect.disabled = false;
    }

    if (categorySelect) {
        populateCrops(preCategory);
        categorySelect.addEventListener("change", (e: Event) => {
            const target = e.target as HTMLSelectElement;
            populateCrops(target.value);
        });
    }

    form.addEventListener("submit", (e: SubmitEvent) => {
        e.preventDefault();

        const harvestInput = harvestGroup.querySelector<HTMLInputElement>("input");
        const expiryInput = expiryGroup.querySelector<HTMLInputElement>("input");

        if (harvestInput?.value && expiryInput?.value) {
            const h = new Date(harvestInput.value);
            const x = new Date(expiryInput.value);
            if (h > x) {
                if (form.parentElement) {
                    form.parentElement.textContent = "❌ Expiry date must be after harvest date.";
                }
                return;
            }
        }

        const formData = new FormData(form);
        onSubmit(formData, submitBtn);
    });

    return form;
}