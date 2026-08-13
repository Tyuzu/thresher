import { createElement } from "../../../components/createElement.js";
import { v4 as uuidv4 } from "https://jspm.dev/uuid";

export function createEl(tag, attrs = {}, children = []) {
  if (attrs.class && typeof attrs.class === "string") {
    attrs.class = [attrs.class];
  }
  return createElement(tag, attrs, children);
}

export function createTabButton(id, panelId, content, onClick) {
  const btn = createEl("button", {
    id,
    type: "button",
    class: ["tab-button"],
    role: "tab",
    ariaControls: panelId,
    ariaSelected: "false"
  }, [content]);
  btn.addEventListener("click", onClick);
  return btn;
}

export function createPanel(id, tabId, children) {
  return createEl("div", {
    id,
    class: ["tab-panel"],
    role: "tabpanel",
    ariaLabelledby: tabId,
    style: "display: none;"
  }, children);
}

export function createFileInput(type, multiple) {
  return createEl("input", {
    id: `file-input-${type}`,
    name: `file_${type}`,
    type: "file",
    class: ["file-input"],
    accept: `${type}/*`,
    multiple: multiple ? true : undefined
  });
}

export function createPreviewContainer(id) {
  return createEl("div", { id, class: ["file-preview"] });
}

// Replace FileReader in renderPreviewList with fast Blob URLs
export function renderPreviewList(files, container, type, input, onChange) {
  container.innerHTML = "";
  const fileArr = Array.from(files);

  fileArr.forEach((file, index) => {
    if (!file.type.startsWith(type)) return;

    const src = URL.createObjectURL(file); // Synchronous & lightweight memory pointer
    let mediaEl;

    if (type === "image") {
      mediaEl = createEl("img", { src, alt: file.name || "Image Preview", class: ["preview-image"] });
    } else if (type === "video") {
      mediaEl = createEl("video", { src, controls: true, class: ["preview-video"] });
    } else {
      mediaEl = createEl("audio", { src, controls: true, class: ["preview-audio"] });
    }

    const removeBtn = createEl("button", { type: "button", class: ["remove-btn"], ariaLabel: "Remove file" }, ["✖"]);
    removeBtn.addEventListener("click", () => {
      URL.revokeObjectURL(src); // Clean up memory
      fileArr.splice(index, 1);
      const dt = new DataTransfer();
      fileArr.forEach(f => dt.items.add(f));
      input.files = dt.files;
      renderPreviewList(fileArr, container, type, input, onChange);
      if (onChange) onChange();
    });

    const wrapper = createEl("div", { class: ["preview-wrapper"] }, [mediaEl, removeBtn]);
    container.appendChild(wrapper);
  });
}

export async function getCSRFToken() {
  return uuidv4();
}