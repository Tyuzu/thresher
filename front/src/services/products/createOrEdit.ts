import { createElement } from "../../components/createElement.js";
import { createFormGroup } from "../../components/form/createFormGroupEnhanced.js";
import { saveFarmItem, deleteFarmItem } from "./api.js";
import Button from "../../components/base/Button.js";
import { CategoryOption, FarmItem, ItemPayload, ItemType } from "./types.js";

export function renderItemForm(
  container: HTMLElement,
  mode: "create" | "edit",
  itemData: FarmItem | null,
  type: ItemType,
  onDone: () => void
): void {
  container.replaceChildren();

  const form = createElement("form", { class: "create-section" }) as HTMLFormElement;

  // ---------------------------------
  // CATEGORY OPTIONS
  // ---------------------------------

  const getCategoryOptions = (itemType: ItemType): CategoryOption[] => {
    if (itemType === "product") {
      return [
        { value: "", label: "Select category" },
        { value: "Spices", label: "Spices" },
        { value: "Pickles", label: "Pickles" },
        { value: "Flour", label: "Flour" },
        { value: "Oils", label: "Oils" },
        { value: "Honey", label: "Honey" },
        { value: "Tea & Coffee", label: "Tea & Coffee" },
        { value: "Dry Fruits", label: "Dry Fruits" },
        { value: "Natural Sweeteners", label: "Natural Sweeteners" }
      ];
    }

    if (itemType === "tool") {
      return [
        { value: "", label: "Select category" },
        { value: "Cutting", label: "Cutting" },
        { value: "Irrigation", label: "Irrigation" },
        { value: "Harvesting", label: "Harvesting" },
        { value: "Hand Tools", label: "Hand Tools" },
        { value: "Protective Gear", label: "Protective Gear" },
        { value: "Fertilizer Applicators", label: "Fertilizer Applicators" }
      ];
    }

    return [];
  };

  const categories = getCategoryOptions(type);

  // ---------------------------------
  // FORM GROUPS
  // ---------------------------------

  const nameGroup = createFormGroup({
    type: "text",
    id: "name",
    label: "Name",
    value: itemData?.name || "",
    placeholder: "Enter item name",
    required: true
  });

  const categoryGroup = createFormGroup({
    type: categories.length ? "select" : "text",
    id: "category",
    label: "Category",
    value: itemData?.category || "",
    placeholder: categories.length ? "" : "e.g., Fruit, Tool",
    required: true,
    options: categories
  });

  const priceGroup = createFormGroup({
    type: "number",
    id: "price",
    label: "Price (₹)",
    value: itemData?.price ?? "",
    placeholder: "e.g., 49.99",
    required: true,
    additionalProps: {
      step: "0.01",
      min: "0"
    }
  });

  const discountGroup = createFormGroup({
    type: "number",
    id: "discount",
    label: "Discount (%)",
    value: itemData?.discount ?? "",
    placeholder: "e.g. 10",
    additionalProps: {
      min: "0",
      max: "100",
      step: "0.01"
    }
  });

  const quantityGroup = createFormGroup({
    type: "number",
    id: "quantity",
    label: "Quantity",
    value: itemData?.quantity ?? "",
    placeholder: "e.g., 100",
    required: true,
    additionalProps: {
      min: "0"
    }
  });

  const unitGroup = createFormGroup({
    type: "select",
    id: "unit",
    label: "Unit",
    value: itemData?.unit || "",
    required: true,
    options: [
      { value: "", label: "Select unit" },
      { value: "kg", label: "kg" },
      { value: "litre", label: "litre" },
      { value: "units", label: "units" }
    ]
  });

  const skuGroup = createFormGroup({
    type: "text",
    id: "sku",
    label: "SKU / Code",
    value: itemData?.sku || "",
    placeholder: "Optional code"
  });

  const availableFromGroup = createFormGroup({
    type: "date",
    id: "availableFrom",
    label: "Available From",
    value: itemData?.availableFrom?.slice(0, 10) || ""
  });

  const availableToGroup = createFormGroup({
    type: "date",
    id: "availableTo",
    label: "Available To",
    value: itemData?.availableTo?.slice(0, 10) || ""
  });

  const descriptionGroup = createFormGroup({
    type: "textarea",
    id: "description",
    label: "Description",
    value: itemData?.description || "",
    placeholder: "Detailed info",
    required: true
  });

  const featuredGroup = createFormGroup({
    type: "checkbox",
    id: "featured",
    label: "Featured?",
    additionalProps: {
      checked: itemData?.featured || false
    }
  });

  form.append(
    categoryGroup,
    nameGroup,
    priceGroup,
    discountGroup,
    quantityGroup,
    unitGroup,
    skuGroup,
    availableFromGroup,
    availableToGroup,
    descriptionGroup,
    featuredGroup
  );

  // ---------------------------------
  // BUTTONS
  // ---------------------------------

  const submitBtn = Button({
    title: mode === "create" ? `Create ${type}` : `Update ${type}`,
    id: `submit-${type}-btn`,
    type: "submit",
    classes: "primary-button"
  }) as HTMLButtonElement;

  const cancelBtn = Button({
    title: "Cancel",
    id: `cancel-${type}-btn`,
    classes: "secondary-button",
    events: {
      click: () => onDone()
    }
  });

  const actions = createElement(
    "div",
    {
      class: "form-actions"
    },
    [submitBtn, cancelBtn]
  );

  form.appendChild(actions);

  // ---------------------------------
  // DELETE BUTTON
  // ---------------------------------

  if (mode === "edit" && itemData?.productid) {
    const deleteBtn = Button({
      title: `Delete ${type}`,
      id: `delete-${type}-btn`,
      classes: "danger-button",
      events: {
        click: async () => {
          if (!confirm(`Delete this ${type}?`)) {
            return;
          }

          try {
            await deleteFarmItem(type, itemData.productid);
            onDone();
          } catch (err: any) {
            if (err?.status === 403) {
              alert("You can only delete items you created");
            } else {
              alert("Delete failed");
            }
            console.error(err);
          }
        }
      }
    });

    form.appendChild(deleteBtn);
  }

  // ---------------------------------
  // SUBMIT HANDLER
  // ---------------------------------

  form.onsubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    submitBtn.disabled = true;

    const parseNumber = (val: string, fallback = 0): number => {
      const parsed = parseFloat(val);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const elements = form.elements as unknown as Record<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

    try {
      const payload: ItemPayload = {
        name: elements["name"]?.value?.trim() ?? "",
        category: elements["category"]?.value?.trim() ?? "",
        price: parseNumber(elements["price"]?.value ?? "", 0),
        discount: parseNumber(elements["discount"]?.value ?? "", 0),
        quantity: parseInt(elements["quantity"]?.value ?? "0", 10) || 0,
        unit: elements["unit"]?.value ?? "",
        sku: elements["sku"]?.value?.trim() || null,
        availableFrom: elements["availableFrom"]?.value || null,
        availableTo: elements["availableTo"]?.value || null,
        description: elements["description"]?.value?.trim() ?? "",
        featured: (elements["featured"] as HTMLInputElement)?.checked ?? false
      };

      const res = await saveFarmItem(type, payload, mode, itemData?.productid);

      if (!res || !res.productid) {
        throw new Error("Request failed");
      }
      onDone();
    } catch (err: any) {
      if (err?.status === 403) {
        alert("You can only edit items you created");
      } else {
        alert(`${mode === "create" ? "Create" : "Update"} failed`);
      }

      console.error(err);
    } finally {
      submitBtn.disabled = false;
    }
  };

  container.appendChild(form);
}