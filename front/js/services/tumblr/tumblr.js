import { apiFetch } from "../../api/api";
import { fetchFeed } from "../feed/fetchFeed.js";
import { createFormGroup } from "../../components/createFormGroupEnhanced.js";
import { renderNewPost } from "../feed/renderNewPost.js";
import {
  createEl,
  createTabButton,
  createPanel,
  createFileInput,
  createPreviewContainer,
  renderPreviewList,
  getCSRFToken
} from "./tumblrHelpers.js";
import { tposts_text, tposts_video, tposts_photo, tposts_audio } from "../../components/tumblrSvgs.js";
import { createIconButton } from "../../utils/svgIconButton.js";
import {
  appendIfValue,
  appendTags,
  clearChildren,
  uploadFilesInBatches,
  handleFileUpload
} from "./tumblrUploader.js";

const MEDIA_ENTITY = "feedpost";

const TAB_CONFIG = [
  {
    name: "Text",
    type: "text",
    icon: tposts_text,
    fields: [
      { label: "Text", type: "textarea", id: "text", placeholder: "Write something…", rows: 4 }
    ]
  },
  {
    name: "Images",
    type: "image",
    multiple: true,
    icon: tposts_photo,
    fields: [
      { label: "Caption", type: "textarea", id: "caption", placeholder: "Add a caption…", rows: 2 },
      { label: "Tags", type: "text", id: "tags", placeholder: "Tags (comma separated)" }
    ]
  },
  {
    name: "Audio",
    type: "audio",
    icon: tposts_audio,
    fields: [
      { label: "Track Title", type: "text", id: "title", placeholder: "Track Title" },
      { label: "Description", type: "textarea", id: "description", placeholder: "Description", rows: 3 },
      { label: "Tags", type: "text", id: "tags", placeholder: "Tags (comma separated)" }
    ]
  },
  {
    name: "Video",
    type: "video",
    icon: tposts_video,
    fields: [
      { label: "Title", type: "text", id: "title", placeholder: "Title" },
      { label: "Description", type: "textarea", id: "description", placeholder: "Description", rows: 3 },
      { label: "Tags", type: "text", id: "tags", placeholder: "Tags (comma separated)" }
    ]
  }
];

export function displayTumblr(isLoggedIn, root) {
  root.replaceChildren();

  // Instance-safe state isolated to this lifecycle execution
  const state = {
    activeTab: null,
    uploads: { text: null, image: [], video: null, audio: null },
    uploading: { image: false, video: false, audio: false },
    objectUrls: { video: null, audio: null }
  };

  // Structured tracking maps grouped cleanly by category type
  const elements = {
    inputs: { text: {}, image: {}, video: {}, audio: {} },
    panels: {},
    previews: {},
    tabButtons: {}
  };

  const layout = createEl("div", { class: ["tumblr-layout"] });
  const formCon = createEl("div", { class: ["tumblr-form"] });
  const tabHeader = createEl("div", { class: ["tab-header"], role: "tablist" });
  const panelWrapper = createEl("div", { class: ["panel-wrapper"] });
  const feedContainer = createEl("div", { id: "postsContainer", class: ["tumblr-feed"] });

  const publishBtn = createEl("button", {
    id: "publish-btn",
    class: ["publish-btn"],
    disabled: true,
    style: "display:none"
  }, ["Publish"]);

  publishBtn.addEventListener("click", handlePublish);

  /* =========================
     BUILD DYNAMIC UI INTERFACES
  ========================= */

  TAB_CONFIG.forEach(cfg => {
    // 1. Build Tab Navigation
    const btn = createTabButton(createIconButton({ svgMarkup: cfg.icon }), () => switchTab(cfg));
    elements.tabButtons[cfg.name] = btn;
    tabHeader.append(btn);

    // 2. Build Form Containers & Upload Hooks
    const container = createEl("div", { class: [`${cfg.type}-container`] });

    if (cfg.type !== "text") {
      const fileInput = createFileInput(cfg.type, cfg.multiple);
      const preview = createPreviewContainer(`${cfg.type}-preview`);
      
      elements.inputs[cfg.type].file = fileInput;
      elements.previews[cfg.type] = preview;
      container.append(fileInput, preview);

      // Wire media upload conditionally utilizing our single generic engine loop
      wireMediaUpload(cfg.type, fileInput, preview);
    }

    // 3. Build Dynamic Input Form Fields
    cfg.fields.forEach(field => {
      const group = createFormGroup(field);
      const inputEl = group.querySelector("input, textarea");
      
      elements.inputs[cfg.type][field.id] = inputEl;
      inputEl.addEventListener("input", updatePublishState);
      container.append(group);
    });

    const panel = createPanel(`${cfg.type}-panel`, [container]);
    panel.style.display = "none";
    elements.panels[cfg.name] = panel;
    panelWrapper.append(panel);
  });

  formCon.append(tabHeader, panelWrapper, publishBtn);
  layout.append(formCon, feedContainer);
  root.append(layout);

  refreshFeed(feedContainer);

  /* =========================
     CORE STATE CONTROLLERS
  ========================= */

  function switchTab(cfg) {
    state.activeTab = cfg;
    publishBtn.style.display = "inline-block";

    Object.entries(elements.panels).forEach(([name, panel]) => {
      panel.style.display = name === cfg.name ? "block" : "none";
    });

    Object.entries(elements.tabButtons).forEach(([name, btn]) => {
      btn.classList.toggle("active", name === cfg.name);
      btn.setAttribute("aria-selected", name === cfg.name);
    });

    updatePublishState();
  }

  function updatePublishState() {
    if (!state.activeTab) {
      publishBtn.disabled = true;
      return;
    }

    const { type } = state.activeTab;
    if (state.uploading[type]) {
      publishBtn.disabled = true;
      return;
    }

    const typeInputs = elements.inputs[type];
    
    switch (type) {
      case "text":
        publishBtn.disabled = !typeInputs.text.value.trim();
        break;
      case "image":
        publishBtn.disabled = !state.uploads.image.length;
        break;
      case "video":
      case "audio":
        publishBtn.disabled = !(state.uploads[type] && typeInputs.title.value.trim());
        break;
      default:
        publishBtn.disabled = true;
    }
  }

  /* =========================
     UNIFIED MEDIA UPLOADER
  ========================= */

  function wireMediaUpload(type, input, preview) {
    let mediaPreviewEl = null;

    // Create persistent previews for playback elements cleanly up front
    if (type === "video" || type === "audio") {
      mediaPreviewEl = createEl(type, { controls: true, class: [`preview-${type}`] });
      preview.append(mediaPreviewEl);
    }

    input.addEventListener("change", async () => {
      const files = Array.from(input.files);
      if (!files.length) return;

      state.uploading[type] = true;
      updatePublishState();

      if (type === "image") {
        clearChildren(preview);
        renderPreviewList(files, preview, "image", input, updatePublishState);
        try {
          state.uploads.image = await uploadFilesInBatches(files, MEDIA_ENTITY, preview, 3, "image");
        } finally {
          state.uploading.image = false;
          updatePublishState();
        }
      } else {
        // Shared dynamic handling block for underlying video + audio binary uploads
        const file = files[0];
        if (state.objectUrls[type]) {
          URL.revokeObjectURL(state.objectUrls[type]);
        }

        state.objectUrls[type] = URL.createObjectURL(file);
        mediaPreviewEl.src = state.objectUrls[type];

        try {
          state.uploads[type] = await handleFileUpload(file, MEDIA_ENTITY, type);
        } finally {
          state.uploading[type] = false;
          updatePublishState();
        }
      }
    });
  }

  /* =========================
     DATA TRANSFERS & MUTATIONS
  ========================= */

  async function handlePublish() {
    publishBtn.disabled = true;
    try {
      const payload = buildPayload();
      const csrfToken = await getCSRFToken();

      const res = await apiFetch("/feed/post", "POST", payload, {
        headers: { "X-CSRF-Token": csrfToken }
      });

      renderNewPost([res.data], 1, feedContainer);
      resetState();
    } catch {
      alert("Failed to publish post.");
    } finally {
      updatePublishState();
    }
  }

  function buildPayload() {
    const { type } = state.activeTab;
    const typeInputs = elements.inputs[type];
    const obj = { type };

    if (type === "text") {
      appendIfValue(obj, "text", typeInputs.text);
    } else if (type === "image") {
      obj.images = state.uploads.image;
      appendIfValue(obj, "caption", typeInputs.caption);
      appendTags(obj, typeInputs.tags);
    } else {
      // Audio and Video payload share exact identical keys now
      obj[type] = state.uploads[type];
      appendIfValue(obj, "title", typeInputs.title);
      appendIfValue(obj, "description", typeInputs.description);
      appendTags(obj, typeInputs.tags);
    }

    return obj;
  }

  function resetState() {
    // Scan all active fields structured nested-by-type to drop parameters clean
    Object.values(elements.inputs).forEach(typeMap => {
      Object.values(typeMap).forEach(input => {
        if (input) input.value = "";
      });
    });

    Object.values(elements.previews).forEach(p => clearChildren(p));

    Object.keys(state.objectUrls).forEach(key => {
      if (state.objectUrls[key]) {
        URL.revokeObjectURL(state.objectUrls[key]);
        state.objectUrls[key] = null;
      }
    });

    state.activeTab = null;
    state.uploads = { text: null, image: [], video: null, audio: null };
    state.uploading = { image: false, video: false, audio: false };

    publishBtn.style.display = "none";
  }

  async function refreshFeed(container) {
    try {
      await fetchFeed(container);
    } catch {
      alert("Failed to load feed.");
    }
  }
}