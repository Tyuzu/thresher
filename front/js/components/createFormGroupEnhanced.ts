import "../../css/form5.css";
import "../../css/form2.css";
import { createElement } from "./createElement.js";

export type FormInputType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "number"
  | "file"
  | "availability"
  | "password"
  | "email"
  | "hidden"
  | "checkbox"
  | "radio"
  | string;

export type ValidationTrigger = "blur" | "change" | "both";

export interface OptionObject {
  value: string;
  label: string;
}

export type SelectOption = string | OptionObject;

export interface AvailabilityDayConfig {
  enabled?: boolean;
  from?: string;
  to?: string;
}

export type AvailabilityValue = Record<string, AvailabilityDayConfig>;

export type ValidatorFn = (
  value: string | HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
) => string | null | false | void;

export type OnValidationChangeFn = (isValid: boolean) => void;

export interface ValidatableElement {
  validate: () => boolean;
  isValid: () => boolean;
  getError: () => string | null;
}

export type CustomInputElement = (
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement
) &
  ValidatableElement;

export interface FormGroupConfig {
  type?: FormInputType;
  id?: string;
  name?: string;
  label?: string;
  value?: unknown;
  placeholder?: string;
  required?: boolean;
  accept?: string;
  options?: SelectOption[];
  multiple?: boolean;
  validator?: ValidatorFn | null;
  validationTrigger?: ValidationTrigger;
  additionalProps?: Record<string, unknown>;
  additionalNodes?: Node[];
  onValidationChange?: OnValidationChangeFn | null;
}

interface DayState {
  enabled: boolean;
  from: string;
  to: string;
}

export function createFormGroupWithValidation({
  type = "text",
  id = "",
  name = "",
  label = "",
  value = "",
  placeholder = "",
  required = false,
  accept = "",
  options = [],
  multiple = false,
  validator = null,
  validationTrigger = "blur",
  additionalProps = {},
  additionalNodes = [],
  onValidationChange = null,
}: FormGroupConfig = {}): HTMLDivElement {
  const group = createElement("div", { class: "form-group" });
  const inputName = name || id || "";
  let inputElement: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

  // --- 1. Create Label ---
  if (label) {
    const labelAttrs = id ? { for: id } : {};
    const labelElement = createElement("label", labelAttrs, [label]);

    if (required) {
      labelElement.appendChild(createElement("span", { class: "form-required" }, ["*"]));
    }
    group.appendChild(labelElement);
  }

  // --- 2. Create Input Elements ---
  switch (type) {
    case "textarea": {
      const textarea = createElement("textarea", {
        id: id || undefined,
        name: inputName || undefined,
        placeholder: placeholder || ""
      });
      if (value !== undefined && value !== null) {
        textarea.value = String(value);
      }
      inputElement = textarea;
      break;
    }

    case "select":
    case "multiselect": {
      const select = createElement("select", {
        id: id || undefined,
        name: inputName || undefined
      });
      if (type === "multiselect" || multiple) {
        select.multiple = true;
      }

      if (placeholder) {
        select.appendChild(
          createElement("option", {
            value: "",
            disabled: true,
            selected: !value
          }, [placeholder])
        );
      }

      const targetValues = new Set(
        Array.isArray(value)
          ? value.map(v => String(v).toLowerCase())
          : [String(value).toLowerCase()]
      );

      options.forEach(opt => {
        const { value: optValue, label: optLabel } =
          typeof opt === "string" ? { value: opt, label: opt } : opt;

        const optionAttrs: Record<string, unknown> = { value: optValue };
        if (optValue === "" && !placeholder) {
          optionAttrs.disabled = true;
        }

        const option = createElement("option", optionAttrs, [optLabel]);

        if (targetValues.has(String(optValue).toLowerCase())) {
          option.selected = true;
        }

        select.appendChild(option);
      });
      inputElement = select;
      break;
    }

    case "number": {
      inputElement = createElement("input", {
        type: "number",
        id: id || "",
        name: inputName || "",
        placeholder: placeholder || "",
        value: (value !== null && value !== undefined && value !== "") ? Number(value) : ""
      });
      break;
    }

    case "file": {
      const fileInput = createElement("input", {
        type: "file",
        id: id || undefined,
        name: inputName || undefined,
        accept: accept || undefined
      });
      if (multiple) fileInput.multiple = true;
      inputElement = fileInput;
      break;
    }

    case "availability": {
      const days = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
      ];

      const availability =
        typeof value === "object" && value !== null ? (value as AvailabilityValue) : {};

      const wrapper = createElement("div", {
        class: "availability-picker"
      });

      const hiddenInput = createElement("input", {
        type: "hidden",
        id: id || undefined,
        name: inputName || undefined
      });

      const state: Record<string, DayState> = {};

      const updateValue = () => {
        hiddenInput.value = JSON.stringify(state);
        hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
      };

      days.forEach(day => {
        const key = day.toLowerCase();

        state[key] = {
          enabled: availability[key]?.enabled || false,
          from: availability[key]?.from || "09:00",
          to: availability[key]?.to || "17:00"
        };

        const row = createElement("div", {
          class: "availability-row"
        });

        const checkbox = createElement("input", {
          type: "checkbox"
        });
        checkbox.checked = state[key].enabled;

        const dayLabel = createElement("span", {
          class: "availability-day"
        }, [day]);

        const fromInput = createElement("input", {
          type: "time",
          value: state[key].from
        });

        const toInput = createElement("input", {
          type: "time",
          value: state[key].to
        });

        fromInput.disabled = !checkbox.checked;
        toInput.disabled = !checkbox.checked;

        checkbox.addEventListener("change", () => {
          state[key].enabled = checkbox.checked;

          fromInput.disabled = !checkbox.checked;
          toInput.disabled = !checkbox.checked;

          updateValue();
        });

        fromInput.addEventListener("input", () => {
          state[key].from = fromInput.value;
          updateValue();
        });

        toInput.addEventListener("input", () => {
          state[key].to = toInput.value;
          updateValue();
        });

        row.append(
          checkbox,
          dayLabel,
          fromInput,
          createElement("span", {}, ["–"]),
          toInput
        );

        wrapper.appendChild(row);
      });

      updateValue();

      wrapper.appendChild(hiddenInput);

      inputElement = hiddenInput;
      group.appendChild(wrapper);

      break;
    }

    default: {
      const defaultInput = createElement("input", {
        type,
        id: id || undefined,
        name: inputName || undefined,
        placeholder: placeholder || "",
        value: (value !== null && value !== undefined) ? String(value) : ""
      });
      if (accept) defaultInput.accept = accept;
      if (type === "file" && multiple) defaultInput.multiple = true;
      inputElement = defaultInput;
      break;
    }
  }

  if (required) inputElement.required = true;

  // Apply extra dynamic attribute updates safely
  Object.entries(additionalProps).forEach(([key, val]) => {
    try {
      if (key in inputElement) {
        (inputElement as unknown as Record<string, unknown>)[key] = val;
      } else {
        inputElement.setAttribute(key, String(val));
      }
    } catch {
      inputElement.setAttribute(key, String(val));
    }
  });

  // --- 3. Error Elements & States ---
  const errorElement = createElement("div", {
    class: "form-error",
    style: "display: none; color: #d32f2f; font-size: 0.875rem; margin-top: 0.25rem;"
  });

  const validationStateInput = document.createElement("input");
  validationStateInput.type = "hidden";
  validationStateInput.className = "form-validation-state";
  validationStateInput.value = "valid";

  const validateInput = (): boolean => {
    if (!validator) return true;

    const fieldValue = type === "file" ? inputElement : inputElement.value;
    const error = validator(fieldValue);

    if (error) {
      errorElement.textContent = error;
      errorElement.style.display = "block";
      inputElement.classList.add("form-input-error");
      validationStateInput.value = "invalid";
    } else {
      errorElement.textContent = "";
      errorElement.style.display = "none";
      inputElement.classList.remove("form-input-error");
      validationStateInput.value = "valid";
    }

    if (onValidationChange) {
      onValidationChange(!error);
    }

    return !error;
  };

  // --- 4. Event Subscriptions & Debouncing ---
  if (validator) {
    let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

    const validateWithDebounce = () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(validateInput, 300);
    };

    if (validationTrigger === "blur" || validationTrigger === "both") {
      inputElement.addEventListener("blur", () => {
        if (debounceTimeout) clearTimeout(debounceTimeout);
        validateInput();
      });
    }

    if (validationTrigger === "change" || validationTrigger === "both") {
      inputElement.addEventListener("change", validateWithDebounce);
      inputElement.addEventListener("input", validateWithDebounce);
    }
  }

  // Bind utilities onto element API references
  const validatableInput = inputElement as CustomInputElement;
  validatableInput.validate = validateInput;
  validatableInput.isValid = () => validationStateInput.value === "valid";
  validatableInput.getError = () => errorElement.textContent;

  group.appendChild(inputElement);
  group.appendChild(errorElement);
  group.appendChild(validationStateInput);

  if (Array.isArray(additionalNodes)) {
    additionalNodes.forEach(node => group.appendChild(node));
  }

  return group;
}

export function createFormGroup(config?: FormGroupConfig): HTMLDivElement {
  return createFormGroupWithValidation(config);
}