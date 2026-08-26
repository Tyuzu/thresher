import { createElement } from "../../../components/createElement.js";
import { createFormGroup } from "../../../components/form/createFormGroupEnhanced.js";

export interface FarmData {
  name?: string;
  location?: string;
  description?: string;
  owner?: string;
  contact?: string;
  practice?: string;
  availabilityTiming?: Record<string, unknown> | string;
  social?: string;
  [key: string]: unknown;
}

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldConfig {
  type: "text" | "textarea" | "select" | "availability" | "url" | "file";
  id: string;
  label: string;
  value?: unknown;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  options?: FieldOption[];
  accept?: string;
  multiple?: boolean;
}

export type SubmitResult = boolean | { success: boolean; [key: string]: unknown } | void;

export type OnSubmitHandler = (formOrData?: HTMLElement | FormData) => Promise<SubmitResult> | SubmitResult;

export interface CreateFarmFormProps {
  isEdit?: boolean;
  farm?: FarmData;
  onSubmit: (formData: FormData | FarmData) => Promise<SubmitResult>;
}

export function createInputField(
  type: string,
  placeholder: string,
  value: string = "",
  required: boolean = false
): HTMLInputElement {
  return createElement("input", {
    type,
    placeholder,
    value,
    required,
  }) as HTMLInputElement;
}

export function createForm(
  fields: HTMLElement[],
  onSubmit: (form: HTMLFormElement) => Promise<SubmitResult>,
  submitText: string = "Submit"
): HTMLFormElement {
  const form = createElement("form", { class: "create-section" }) as HTMLFormElement;

  form.appendChild(createElement("h2", {}, ["Create Farm"]));

  fields.forEach(field => form.appendChild(field));

  const submitBtn = createElement("button", {
    type: "submit"
  }, [submitText]);

  form.appendChild(submitBtn);

  form.addEventListener("submit", async (e: Event) => {
    e.preventDefault();

    const result = await onSubmit(form);

    if (result === true || (typeof result === "object" && result !== null && result.success)) {
      form.reset();
    }
  });

  return form;
}

export function createFarmForm({
  isEdit = false,
  farm = {},
  onSubmit
}: CreateFarmFormProps): HTMLFormElement {
  const fieldsConfig: FieldConfig[] = [
    {
      type: "text",
      id: "farm-name",
      label: "Name",
      value: farm.name || "",
      placeholder: "Farm Name",
      required: true
    },
    {
      type: "text",
      id: "farm-location",
      label: "Location",
      value: farm.location || "",
      placeholder: "Location",
      required: true
    },
    {
      type: "textarea",
      id: "farm-description",
      label: "Description",
      value: farm.description || "",
      placeholder: "Description",
      required: false,
      rows: 3
    },
    {
      type: "text",
      id: "farm-owner",
      label: "Owner",
      value: farm.owner || "",
      placeholder: "Owner",
      required: true
    },
    {
      type: "text",
      id: "farm-contact",
      label: "Contact",
      value: farm.contact || "",
      placeholder: "Contact",
      required: true
    },
    {
      type: "select",
      id: "farm-practice",
      label: "Farming Practice",
      value: farm.practice || "",
      options: [
        { value: "organic", label: "Organic" },
        { value: "conventional", label: "Conventional" },
        { value: "hydroponic", label: "Hydroponic" },
        { value: "regenerative", label: "Regenerative" }
      ]
    },
    {
      type: "availability",
      id: "farm-availability",
      label: "Availability",
      value: farm.availabilityTiming || {}
    },
    {
      type: "url",
      id: "farm-social",
      label: "Social Link",
      value: farm.social || "",
      placeholder: "Website / Social Link"
    }
  ];

  const fields = fieldsConfig.map(field => createFormGroup(field));

  const form = createForm(
    fields,
    async () => {
      const formData = new FormData();

      fieldsConfig.forEach(field => {
        const input = document.getElementById(field.id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;

        if (!input) {
          return;
        }

        const key = field.id.replace("farm-", "");

        switch (field.type) {
          case "availability":
            formData.append(key, input.value || "{}");
            break;

          case "file": {
            const fileInput = input as HTMLInputElement;
            if (fileInput.files?.length) {
              Array.from(fileInput.files).forEach(file => {
                formData.append(key, file);
              });
            }
            break;
          }

          default:
            formData.append(key, input.value.trim());
            break;
        }
      });

      if (!isEdit) {
        formData.append("crops", JSON.stringify([]));
      }

      return await onSubmit(formData);
    },
    isEdit ? "Update Farm" : "Create Farm"
  );

  return form;
}