import { apiFetch } from "../../api/api.js";
import { navigate } from "../../routes/index.js";
import ToggleSwitch from "../../components/ui/ToggleSwitch.mjs";

// --- UI Helpers ---

function createContainer() {
    const container = document.createElement("div");
    container.id = "settings-container";
    return container;
}

function createLoadingIndicator() {
    const loading = document.createElement("div");
    loading.className = "settings-loading";
    loading.textContent = "Loading settings...";
    return loading;
}

function createErrorContainer(message = "") {
    const error = document.createElement("div");
    error.className = "settings-error";
    error.textContent = message;
    return error;
}

function showToast(message, isError = false) {
    const toast = document.createElement("div");
    toast.className = `settings-toast ${isError ? "error" : "success"}`;
    toast.textContent = message;
    toast.setAttribute("role", "status");

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 2500);
}

// --- API Layer ---

async function updateSetting(type, value) {
    try {
        const response = await apiFetch("/settings", "PATCH", { [type]: value });

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

async function loadSettings() {
    const [schemaRes, valuesRes] = await Promise.all([
        apiFetch("/settings/schema"),
        apiFetch("/settings"),
    ]);

    // Ensure responses are valid before attempting to render
    if (!schemaRes || !Array.isArray(schemaRes.data || schemaRes)) {
        throw new Error("Invalid schema received from server");
    }

    const schema = schemaRes.data || schemaRes;
    const values = (valuesRes && valuesRes.data) ? valuesRes.data : (valuesRes || {});

    return { schema, values };
}

// --- Dynamic Control Factories ---

function createToggle(setting, value, inputId) {
    const toggle = ToggleSwitch((checked) => {
        updateSetting(setting.type, checked);
    });

    const input = toggle.querySelector("input");
    if (input) {
        input.id = inputId;
        input.checked = Boolean(value);
    }

    return toggle;
}

function createSelect(setting, value, inputId) {
    const select = document.createElement("select");
    select.id = inputId;

    (setting.options || []).forEach((option) => {
        const el = document.createElement("option");
        el.value = option;
        el.textContent = option.charAt(0).toUpperCase() + option.slice(1);
        el.selected = option === value;
        select.appendChild(el);
    });

    select.addEventListener("change", () => {
        updateSetting(setting.type, select.value);
    });

    return select;
}

function createInputControl(setting, value, inputId, type = "text") {
    const input = document.createElement("input");
    input.type = type;
    input.id = inputId;

    if (type === "number") {
        input.value = value ?? 0;
    } else {
        input.value = value || "";
    }

    // Rollback value if save fails on blur
    let originalValue = input.value;

    input.addEventListener("focus", () => {
        originalValue = input.value;
    });

    input.addEventListener("blur", async () => {
        const newValue = type === "number" ? Number(input.value) : input.value;
        if (newValue === originalValue) return;

        const success = await updateSetting(setting.type, newValue);
        if (success) {
            originalValue = input.value;
        } else {
            input.value = originalValue; // Revert visually on API failure
        }
    });

    return input;
}

function createControl(setting, value, inputId) {
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

function createSettingCard(setting, value) {
    const card = document.createElement("div");
    card.className = "setting-card";

    // Unique ID for connecting <label> to input controls
    const inputId = `setting-${setting.type}`;

    const info = document.createElement("div");
    info.className = "setting-info";

    const title = document.createElement("label");
    title.htmlFor = inputId;
    title.className = "setting-title";
    title.textContent = setting.label;

    const description = document.createElement("p");
    description.textContent = setting.description;

    info.append(title, description);

    const control = document.createElement("div");
    control.className = "setting-control";
    control.appendChild(createControl(setting, value, inputId));

    card.append(info, control);
    return card;
}

function renderSettings(container, schema, values) {
    const categories = new Map();
    const fragment = document.createDocumentFragment();

    schema.forEach((setting) => {
        const categoryName = setting.category || "General";

        if (!categories.has(categoryName)) {
            const section = document.createElement("section");
            section.className = "settings-category";

            const heading = document.createElement("h2");
            heading.textContent = categoryName;

            const body = document.createElement("div");
            body.className = "settings-category-body";

            section.append(heading, body);
            fragment.appendChild(section);

            categories.set(categoryName, body);
        }

        const categoryBody = categories.get(categoryName);
        const settingValue = values[setting.type];
        categoryBody.appendChild(createSettingCard(setting, values[setting.type]));
    });

    container.appendChild(fragment);
}

// --- Main Entry Point ---

async function displaySettings(isLoggedIn, settingsSec) {
    if (!isLoggedIn) {
        navigate("/login");
        return;
    }

    const container = createContainer();
    container.appendChild(createLoadingIndicator());
    settingsSec.replaceChildren(container);

    try {
        const { schema, values } = await loadSettings();

        // Clear loading state before rendering
        container.replaceChildren();
        renderSettings(container, schema, values);
    } catch (err) {
        console.error("Display settings error:", err);
        container.replaceChildren(
            createErrorContainer(err.message || "Failed to load settings. Please try again.")
        );
    }
}

export { displaySettings };