import { navigate } from "../../routes/navigate.js";
import { createElement } from "../../components/createElement.js";
import ToggleSwitch from "../../components/ui/ToggleSwitch.js";
import {
  loadSettingsRequest,
  updateSettingRequest,
  type ApiResponse,
  type SettingSchemaItem,
  type SettingsValues
} from "./api.js";

// --- UI Helpers ---

function createContainer(): HTMLElement {
  return createElement("div", { id: "settings-container" });
}

function createLoadingIndicator(): HTMLElement {
  return createElement(
    "div",
    { class: "settings-loading" },
    ["Loading settings..."]
  );
}

function createErrorContainer(message = ""): HTMLElement {
  return createElement(
    "div",
    { class: "settings-error" },
    [message]
  );
}

function showToast(message: string, isError = false): void {
  const toast = createElement(
    "div",
    {
      class: `settings-toast ${isError ? "error" : "success"}`,
      role: "status"
    },
    [message]
  );

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 2500);
}

// --- API Layer ---

async function updateSetting(type: string, value: unknown): Promise<boolean> {
  try {
    const response = await updateSettingRequest(type, value);

    if (!response || response.status !== "success") {
      throw new Error(response?.message || "Update failed");
    }

    showToast("Saved");
    return true;
  } catch (error) {
    console.error(`Failed to update setting [${type}]:`, error);
    showToast("Failed to save", true);
    return false;
  }
}

async function loadSettings(): Promise<{ schema: SettingSchemaItem[]; values: SettingsValues }> {
  return await loadSettingsRequest();
}

// --- Dynamic Control Factories ---

function createToggle(setting: SettingSchemaItem, value: unknown, inputId: string): HTMLElement {
  const toggle = ToggleSwitch(async (checked: boolean) => {
    const success = await updateSetting(setting.type, checked);
    if (!success && input) {
      input.checked = !checked; // Rollback toggle state on failure
    }
  });

  const input = toggle.querySelector<HTMLInputElement>("input");
  if (input) {
    input.id = inputId;
    input.checked = Boolean(value);
  }

  return toggle;
}

function createSelect(setting: SettingSchemaItem, value: unknown, inputId: string): HTMLSelectElement {
  const options = (setting.options || []).map((option) =>
    createElement(
      "option",
      {
        value: option,
        selected: option === value
      },
      [option.charAt(0).toUpperCase() + option.slice(1)]
    )
  );

  const select = createElement(
    "select",
    {
      id: inputId,
      class: "setting-select",
      events: {
        change: async (e: Event) => {
          const target = e.target as HTMLSelectElement;
          await updateSetting(setting.type, target.value);
        }
      }
    },
    options
  ) as HTMLSelectElement;

  return select;
}

function createInputControl(
  setting: SettingSchemaItem,
  value: unknown,
  inputId: string,
  type = "text"
): HTMLInputElement {
  const initialValue = type === "number" ? String(value ?? 0) : String(value || "");

  let originalValue = initialValue;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const saveValue = async (inputEl: HTMLInputElement): Promise<void> => {
    const newValue = type === "number" ? Number(inputEl.value) : inputEl.value;
    if (String(newValue) === originalValue) return;

    const success = await updateSetting(setting.type, newValue);
    if (success) {
      originalValue = String(newValue);
    } else {
      inputEl.value = originalValue; // Revert visually on API failure
    }
  };

  const input = createElement("input", {
    type,
    id: inputId,
    value: initialValue,
    class: "setting-input",
    events: {
      focus: (e: Event) => {
        const target = e.target as HTMLInputElement;
        originalValue = target.value;
      },
      input: (e: Event) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        const target = e.target as HTMLInputElement;
        debounceTimer = setTimeout(() => saveValue(target), 800);
      },
      blur: (e: Event) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        const target = e.target as HTMLInputElement;
        saveValue(target);
      }
    }
  }) as HTMLInputElement;

  return input;
}

function createControl(setting: SettingSchemaItem, value: unknown, inputId: string): HTMLElement {
  switch (setting.control) {
    case "toggle":
      return createToggle(setting, value, inputId);
    case "select":
      return createSelect(setting, value, inputId);
    case "time":
      return createInputControl(setting, value, inputId, "time");
    case "number":
      return createInputControl(setting, value, inputId, "number");
    default:
      return createInputControl(setting, value, inputId, "text");
  }
}

// --- Card & Layout Rendering ---

function createSettingCard(setting: SettingSchemaItem, value: unknown): HTMLElement {
  const inputId = `setting-${setting.type}`;

  const title = createElement(
    "label",
    { htmlFor: inputId, class: "setting-title" },
    [setting.label]
  );

  const description = createElement("p", { class: "setting-description" }, [setting.description]);

  const info = createElement("div", { class: "setting-info" }, [title, description]);

  const controlContainer = createElement(
    "div",
    { class: "setting-control" },
    [createControl(setting, value, inputId)]
  );

  return createElement("div", { class: "setting-card" }, [info, controlContainer]);
}

function renderSettings(
  container: HTMLElement,
  schema: SettingSchemaItem[],
  values: SettingsValues
): void {
  const categories = new Map<string, HTMLElement>();
  const fragment = document.createDocumentFragment();

  schema.forEach((setting) => {
    const categoryName = setting.category || "General";

    if (!categories.has(categoryName)) {
      const heading = createElement("h2", { class: "settings-category-title" }, [categoryName]);
      const body = createElement("div", { class: "settings-category-body" });

      const section = createElement("section", { class: "settings-category" }, [
        heading,
        body
      ]);

      fragment.appendChild(section);
      categories.set(categoryName, body);
    }

    const categoryBody = categories.get(categoryName)!;
    categoryBody.appendChild(createSettingCard(setting, values[setting.type]));
  });

  container.appendChild(fragment);
}

// --- Main Entry Point ---

export async function displaySettings(isLoggedIn: boolean, settingsSec: HTMLElement): Promise<void> {
  if (!isLoggedIn) {
    navigate("/login");
    return;
  }

  const container = createContainer();
  container.appendChild(createLoadingIndicator());
  settingsSec.replaceChildren(container);

  try {
    const { schema, values } = await loadSettings();

    container.replaceChildren();
    renderSettings(container, schema, values);
  } catch (err) {
    const error = err as Error;
    console.error("Display settings error:", error);
    container.replaceChildren(
      createErrorContainer(error.message || "Failed to load settings. Please try again.")
    );
  }
}