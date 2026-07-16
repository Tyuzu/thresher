import { createElement } from "./createElement.js";

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
  validationTrigger = "blur", // "blur", "change", or "both"
  additionalProps = {},
  additionalNodes = [],
  onValidationChange = null, // Callback when validation state changes
}) {
  const group = createElement("div", { class: "form-group" });
  const inputName = name || id || "";
  let inputElement;

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
    case "textarea":
      inputElement = createElement("textarea", {
        id: id || undefined,
        name: inputName || undefined,
        placeholder: placeholder || ""
      });
      if (value !== undefined && value !== null) {
        inputElement.value = String(value);
      }
      break;

    case "select":
    case "multiselect":
      inputElement = createElement("select", {
        id: id || undefined,
        name: inputName || undefined
      });
      if (type === "multiselect" || multiple) {
        inputElement.multiple = true;
      }

      if (placeholder) {
        inputElement.appendChild(createElement("option", {
          value: "",
          disabled: true,
          selected: !value
        }, [placeholder]));
      }

      // Optimize: Pre-compute search keys outside loop
      const targetValues = new Set(
        Array.isArray(value)
          ? value.map(v => String(v).toLowerCase())
          : [String(value).toLowerCase()]
      );

      options.forEach(opt => {
        const { value: optValue, label: optLabel } =
          typeof opt === "string" ? { value: opt, label: opt } : opt;

        const optionAttrs = { value: optValue };
        if (optValue === "" && !placeholder) {
          optionAttrs.disabled = true;
        }

        const option = createElement("option", optionAttrs, [optLabel]);

        if (targetValues.has(String(optValue).toLowerCase())) {
          option.selected = true;
        }

        inputElement.appendChild(option);
      });
      break;

    case "number":
      inputElement = createElement("input", {
        type: "number",
        id: id || "",
        name: inputName || "",
        placeholder: placeholder || "",
        value: (value !== null && value !== undefined && value !== "") ? Number(value) : ""
      });
      break;

    case "file":
      inputElement = createElement("input", {
        type: "file",
        id: id || undefined,
        name: inputName || undefined,
        accept: accept || undefined
      });
      if (multiple) inputElement.multiple = true;
      break;


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
        typeof value === "object" && value !== null ? value : {};

      const wrapper = createElement("div", {
        class: "availability-picker"
      });

      const hiddenInput = createElement("input", {
        type: "hidden",
        id: id || undefined,
        name: inputName || undefined
      });

      const state = {};

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

    default:
      inputElement = createElement("input", {
        type,
        id: id || undefined,
        name: inputName || undefined,
        placeholder: placeholder || "",
        value: (value !== null && value !== undefined) ? String(value) : ""
      });
      if (accept) inputElement.accept = accept;
      if (type === "file" && multiple) inputElement.multiple = true;
      break;
  }

  if (required) inputElement.required = true;

  // Apply extra dynamic attribute updates safely
  Object.entries(additionalProps).forEach(([key, val]) => {
    try {
      if (key in inputElement) {
        inputElement[key] = val;
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

  // Fixed ReferenceError Bug: Execute the provided validator closure callback
  const validateInput = () => {
    if (!validator) return true;

    const fieldValue = type === "file" ? inputElement : inputElement.value;
    const error = validator(fieldValue); // Standard execution interface wrapper

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
    let debounceTimeout = null;

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
  inputElement.validate = validateInput;
  inputElement.isValid = () => validationStateInput.value === "valid";
  inputElement.getError = () => errorElement.textContent;

  group.appendChild(inputElement);
  group.appendChild(errorElement);
  group.appendChild(validationStateInput);

  if (Array.isArray(additionalNodes)) {
    additionalNodes.forEach(node => group.appendChild(node));
  }

  return group;
}

export function createFormGroup(config) {
  return createFormGroupWithValidation(config);
}