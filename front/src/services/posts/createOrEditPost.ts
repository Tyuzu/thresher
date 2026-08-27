import { createElement } from "../../components/createElement.js";
import { fetchPostById, savePostRequest } from "./api.js";
import { createFormGroup } from "../../components/form/createFormGroupEnhanced.js";
import Button from "../../components/base/Button.js";
import { capitalize } from "../profile/profileHelpers.js";
import { resolveImagePath, PictureType, EntityType } from "../../utils/imagePaths.js";
import { navigate } from "../../routes/navigate.js";
import { uploadFile } from "../media/api/mediaApi.js";
import Notify from "../../components/ui/Notify.js";
import { getUploadKey } from "../newchat/fileUpload.js";

/* ---------------------- TYPES ---------------------- */
export type BlockType = "text" | "image" | "code" | "video";

export interface TextBlock {
  type: "text";
  content: string;
}

export interface ImageBlock {
  type: "image";
  url: string;
}

export interface CodeBlock {
  type: "code";
  language: string;
  content: string;
}

export interface VideoBlock {
  type: "video";
  url: string;
  caption: string;
}

export type Block = TextBlock | ImageBlock | CodeBlock | VideoBlock;

export interface UploadContext {
  entityType?: EntityType;
  entityId?: string | number;
}

export interface BlockPlugin<T extends Block = Block> {
  create: () => T;
  render: (
    block: T,
    update: (newBlock: T) => void,
    uploadCtx?: UploadContext
  ) => HTMLElement;
  sanitize: (b: T) => T | null;
}

export interface PostField {
  id: string;
  label: string;
  type: string;
  options?: string[];
  placeholder?: string;
}

export interface PostTypeConfig {
  label: string;
  availableBlocks: BlockType[];
  fields: PostField[];
}

export interface Post {
  postid?: string | number;
  type?: string;
  title?: string;
  hashtags?: string[];
  category?: string;
  subcategory?: string;
  blocks?: Block[] | unknown[];
  [key: string]: unknown;
}

export interface RenderPostEditorOptions {
  isLoggedIn: boolean;
  postId?: string | number;
  contentContainer: HTMLElement;
  mode: "create" | "edit";
}

export interface SelectGroupOptions {
  id: string;
  label: string;
  value: string;
  options: string[];
  required?: boolean;
}

export interface TextGroupOptions {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
}

/* ---------------------- BLOCK PLUGINS ---------------------- */
const BlockPlugins: { [K in BlockType]: BlockPlugin<Extract<Block, { type: K }>> } = {
  text: {
    create: () => ({ type: "text", content: "" }),
    render: (block, update) => {
      const input = createElement("textarea", { rows: "3" }, [
        block.content || ""
      ]) as HTMLTextAreaElement;
      input.setAttribute("name", "textin");
      input.addEventListener("input", () => update({ ...block, content: input.value }));

      return createElement("div", { class: "block block-text" }, [
        createElement("span", { class: "block-label" }, ["Text Block"]),
        input
      ]);
    },
    sanitize: (b) => (b.content?.trim() ? b : null)
  },

  image: {
    create: () => ({ type: "image", url: "" }),
    render: (block, update, uploadCtx) => {
      const fileInput = createElement("input", {
        type: "file",
        accept: "image/*"
      }) as HTMLInputElement;

      const preview = createElement("img", {
        class: "image-preview"
      }) as HTMLImageElement;

      if (block.url) {
        preview.setAttribute(
          "src",
          resolveImagePath(EntityType.BLOGPOST, PictureType.THUMB, String(block.url))
        );
      }

      fileInput.addEventListener("change", async () => {
        const file = fileInput.files?.[0];

        if (!file) {
          return;
        }

        if (!file.type.startsWith("image/")) {
          Notify("Please upload a valid image file.", {
            type: "error"
          });
          return;
        }

        try {
          Notify("Uploading image...", {
            type: "info",
            duration: 2000
          });

          const uploadedImage = await uploadFile({
            id: crypto.randomUUID(),
            file,
            key: getUploadKey(file),
            entityType: uploadCtx?.entityType || EntityType.BLOGPOST,
            entityId: String(uploadCtx?.entityId || EntityType.BLOGPOST)
          });

          const imageKey =
            uploadedImage?.["savedname"] ||
            uploadedImage?.filename ||
            uploadedImage?.key ||
            uploadedImage?.["name"] ||
            uploadedImage?.["fileName"] ||
            "";

          const returnedUrl =
            uploadedImage?.url || uploadedImage?.["src"] || uploadedImage?.["path"] || "";

          if (!imageKey && !returnedUrl) {
            throw new Error("Image upload failed.");
          }

          const finalUrlOrKey = String(returnedUrl || imageKey);

          update({
            ...block,
            url: finalUrlOrKey
          });

          if (/^https?:\/\//i.test(finalUrlOrKey)) {
            preview.setAttribute("src", finalUrlOrKey);
          } else {
            preview.setAttribute(
              "src",
              resolveImagePath(EntityType.BLOGPOST, PictureType.THUMB, finalUrlOrKey)
            );
          }
        } catch (err: unknown) {
          console.error("Upload failed", err);
          const message = err instanceof Error ? err.message : "Unknown error";

          Notify(`Upload failed: ${message}`, {
            type: "error"
          });
        }
      });

      return createElement("div", { class: "block block-image" }, [
        createElement("span", { class: "block-label" }, ["Image Block"]),
        fileInput,
        preview
      ]);
    },
    sanitize: (b) => (String(b.url || "").trim() ? b : null)
  },

  code: {
    create: () => ({ type: "code", language: "js", content: "" }),
    render: (block, update) => {
      const langInput = createElement("input", {
        type: "text",
        placeholder: "Language",
        value: block.language || ""
      }) as HTMLInputElement;

      const codeArea = createElement("textarea", { rows: "5" }, [
        block.content || ""
      ]) as HTMLTextAreaElement;

      langInput.addEventListener("input", () =>
        update({ ...block, language: langInput.value })
      );
      codeArea.addEventListener("input", () =>
        update({ ...block, content: codeArea.value })
      );

      return createElement("div", { class: "block block-code" }, [
        createElement("span", { class: "block-label" }, ["Code Block"]),
        langInput,
        codeArea
      ]);
    },
    sanitize: (b) => (b.content?.trim() ? b : null)
  },

  video: {
    create: () => ({ type: "video", url: "", caption: "" }),
    render: (block, update) => {
      const urlInput = createElement("input", {
        type: "text",
        placeholder: "Video URL",
        value: block.url || ""
      }) as HTMLInputElement;

      const captionInput = createElement("input", {
        type: "text",
        placeholder: "Caption",
        value: block.caption || ""
      }) as HTMLInputElement;

      const preview = createElement("video", {
        controls: true,
        class: "video-preview"
      }) as HTMLVideoElement;

      if (block.url) {
        preview.setAttribute("src", block.url);
      }

      urlInput.addEventListener("input", () => {
        update({ ...block, url: urlInput.value });
        preview.setAttribute("src", urlInput.value);
      });

      captionInput.addEventListener("input", () =>
        update({ ...block, caption: captionInput.value })
      );

      return createElement("div", { class: "block block-video" }, [
        createElement("span", { class: "block-label" }, ["Video Block"]),
        urlInput,
        captionInput,
        preview
      ]);
    },
    sanitize: (b) => (b.url?.trim() ? b : null)
  }
};

/* ---------------------- POST TYPE PLUGINS ---------------------- */
const PostTypes: Record<string, PostTypeConfig> = {
  standard: {
    label: "Standard",
    availableBlocks: ["text", "image"],
    fields: []
  },
  guide: {
    label: "Guide",
    availableBlocks: ["text", "image", "code"],
    fields: [
      { id: "difficulty", label: "Difficulty", type: "select", options: ["Easy", "Medium", "Hard"] }
    ]
  },
  tutorial: {
    label: "Tutorial",
    availableBlocks: ["text", "image", "code", "video"],
    fields: [
      { id: "duration", label: "Duration (mins)", type: "text", placeholder: "e.g. 20" }
    ]
  },
  recipe: {
    label: "Recipe",
    availableBlocks: ["text", "image", "video"],
    fields: [
      { id: "servings", label: "Servings", type: "text", placeholder: "e.g. 4" },
      { id: "cookTime", label: "Cook Time", type: "text", placeholder: "e.g. 30 mins" }
    ]
  }
};

/* ---------------------- HELPERS ---------------------- */
function createSelectGroup({ id, label, value, options, required = false }: SelectGroupOptions): HTMLElement {
  return createFormGroup({
    type: "select",
    id,
    name: id,
    label,
    value,
    options,
    required
  });
}

function createTextGroup({ id, label, value, placeholder, required = false }: TextGroupOptions): HTMLElement {
  return createFormGroup({
    type: "text",
    id,
    name: id,
    label,
    value,
    placeholder,
    required
  });
}

/* ---------------------- BLOCK MANAGER ---------------------- */
function createBlockManager(
  blocksContainer: HTMLElement,
  blocksTextarea: HTMLElement,
  uploadCtx?: UploadContext
) {
  let blocks: Block[] = [];

  function sync(): void {
    const textarea = blocksTextarea.querySelector("textarea") as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.value = JSON.stringify(blocks, null, 2);
    }
  }

  function setupDrag(node: HTMLElement, i: number): void {
    node.setAttribute("draggable", "true");

    node.addEventListener("dragstart", (e: DragEvent) => {
      e.dataTransfer?.setData("text/plain", String(i));
    });

    node.addEventListener("dragover", (e: DragEvent) => {
      e.preventDefault();
      node.classList.add("drag-over");
    });

    node.addEventListener("dragleave", () => {
      node.classList.remove("drag-over");
    });

    node.addEventListener("drop", (e: DragEvent) => {
      e.preventDefault();
      node.classList.remove("drag-over");

      const dataStr = e.dataTransfer?.getData("text/plain");
      if (!dataStr) return;

      const fromIndex = parseInt(dataStr, 10);
      if (Number.isNaN(fromIndex) || fromIndex === i) {
        return;
      }

      const moved = blocks[fromIndex];
      if (!moved) return;

      blocks.splice(fromIndex, 1);
      blocks.splice(i, 0, moved);
      render();
      sync();
    });
  }

  function render(): void {
    blocksContainer.replaceChildren();

    blocks.forEach((block, i) => {
      const plugin = BlockPlugins[block.type] as BlockPlugin<Block> | undefined;
      if (!plugin) {
        return;
      }

      const node = plugin.render(
        block,
        (newBlock: Block) => {
          blocks[i] = newBlock;
          sync();
        },
        uploadCtx
      );

      const removeBtn = Button({
        title: "Remove",
        id: `remove-${i}`,
        classes: "buttonx",
        events: {
          click: () => {
            blocks.splice(i, 1);
            render();
            sync();
          }
        }
      });

      node.appendChild(removeBtn);
      setupDrag(node, i);
      blocksContainer.appendChild(node);
    });
  }

  function addBlock(type: BlockType): void {
    const plugin = BlockPlugins[type];
    if (!plugin) {
      return console.warn("Unknown block type:", type);
    }

    blocks.push(plugin.create());
    render();
    sync();
  }

  function getSanitizedBlocks(): Block[] {
    return blocks
      .map((b) => {
        const plugin = BlockPlugins[b.type] as BlockPlugin<Block> | undefined;
        return plugin?.sanitize(b) ?? null;
      })
      .filter((b): b is Block => b !== null);
  }

  return {
    setBlocks: (b: Block[]) => {
      blocks = Array.isArray(b) ? b : [];
      render();
      sync();
    },
    addBlock,
    getBlocks: () => blocks,
    getSanitizedBlocks,
    render,
    sync
  };
}

/* ---------------------- MAIN EDITOR ---------------------- */
async function renderPostEditor({
  isLoggedIn,
  postId,
  contentContainer,
  mode
}: RenderPostEditorOptions): Promise<void> {
  if (!isLoggedIn) {
    contentContainer.replaceChildren(
      createElement("div", {}, [`You must be logged in to ${mode} a post.`])
    );
    return;
  }

  let existingPost: Post | null = null;

  if (mode === "edit" && postId) {
    try {
      const data = await fetchPostById(postId);
      existingPost = data?.post || null;
    } catch {
      contentContainer.replaceChildren(
        createElement("div", {}, ["Failed to load post."])
      );
      return;
    }
  }

  const normalizedType = (existingPost?.type || "standard").toLowerCase();

  const postTypeGroup = createSelectGroup({
    id: "postType",
    label: "Post Type",
    value: capitalize(normalizedType),
    options: Object.keys(PostTypes).map((t) => capitalize(t)),
    required: true
  });

  const titleGroup = createTextGroup({
    id: "title",
    label: "Title",
    value: existingPost?.title || "",
    placeholder: "Enter post title",
    required: true
  });

  const hashtagsGroup = createFormGroup({
    type: "text",
    id: "hashtags",
    name: "hashtags",
    label: "Hashtags",
    value: existingPost?.hashtags ? existingPost.hashtags.join(", ") : "",
    placeholder: "e.g. javascript, webdev, tips"
  });

  const categoryMap: Record<string, string[]> = {
    Blog: ["Tips", "Opinion", "News", "Updates"],
    Coding: ["JavaScript", "Go", "Python", "Rust"],
    Design: ["UI", "UX", "Branding"],
    Food: ["Recipes", "Reviews", "Guides"],
    Travel: ["Destinations", "Tips", "Stories"],
    Review: ["Product", "Place", "Event"],
    General: ["Misc"]
  };

  const categoryOptions = Object.keys(categoryMap);
  const defaultCategory = existingPost?.category || "General";

  const categoryGroup = createSelectGroup({
    id: "category",
    label: "Category",
    value: defaultCategory,
    options: categoryOptions,
    required: true
  });

  const subcategoryGroup = createSelectGroup({
    id: "subcategory",
    label: "Subcategory",
    value: existingPost?.subcategory || (categoryMap[defaultCategory]?.[0] || "Misc"),
    options: categoryMap[defaultCategory] || [],
    required: true
  });

  const categorySelect = categoryGroup.querySelector("select") as HTMLSelectElement | null;
  if (categorySelect) {
    categorySelect.addEventListener("change", (e: Event) => {
      const target = e.target as HTMLSelectElement;
      const selectedCat = target.value;
      const newSubs = categoryMap[selectedCat] || [];
      const subSelect = subcategoryGroup.querySelector("select") as HTMLSelectElement | null;

      if (subSelect) {
        subSelect.replaceChildren(
          ...newSubs.map((s) => createElement("option", { value: s }, [s]))
        );
        subSelect.value = newSubs[0] || "";
      }
    });
  }

  const messageBox = createElement("div", { id: "message-box" });
  const blocksContainer = createElement("div", { class: "blocks-container" });
  const blocksTextarea = createFormGroup({ type: "textarea", id: "blocks", label: "Blocks", value: "" });
  blocksTextarea.style.display = "none";

  const assetEntityId =
    existingPost?.postid ||
    postId ||
    (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));

  const uploadCtx: UploadContext = {
    entityType: EntityType.BLOGPOST,
    entityId: assetEntityId
  };

  const blockManager = createBlockManager(blocksContainer, blocksTextarea, uploadCtx);
  blockManager.setBlocks(
    Array.isArray(existingPost?.blocks)
      ? (existingPost.blocks as Block[])
      : []
  );

  const addBlockButtons = createElement("div", { class: "block-buttons" });

  function renderAddBlockButtons(typeKey: string): void {
    addBlockButtons.replaceChildren();

    const typeCfg = PostTypes[typeKey] || PostTypes["standard"];
    if (!typeCfg?.availableBlocks) return;

    typeCfg.availableBlocks.forEach((bt) => {
      const btn = Button({
        title: `Add ${capitalize(bt)} Block`,
        id: `add-${bt}`,
        classes: "buttonx",
        events: {
          click: () => blockManager.addBlock(bt)
        }
      });

      addBlockButtons.appendChild(btn);
    });
  }

  renderAddBlockButtons(normalizedType);

  const postTypeSelect = postTypeGroup.querySelector("select") as HTMLSelectElement | null;
  if (postTypeSelect) {
    postTypeSelect.addEventListener("change", (e: Event) => {
      const target = e.target as HTMLSelectElement;
      const selected = target.value.toLowerCase();
      renderAddBlockButtons(selected);
      renderExtraFields(selected);
    });
  }

  const extraFieldsContainer = createElement("div", { class: "extra-fields" });

  function collectCurrentExtraFieldValues(): Record<string, string> {
    const values: Record<string, string> = {};
    extraFieldsContainer.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("[name]").forEach((el) => {
      values[el.name] = el.value;
    });
    return values;
  }

  function renderExtraFields(typeKey: string): void {
    const currentValues = collectCurrentExtraFieldValues();
    extraFieldsContainer.replaceChildren();

    const cfg = PostTypes[typeKey] || PostTypes["standard"];
    if (!cfg?.fields) return;

    cfg.fields.forEach((f) => {
      const fieldValue =
        typeof existingPost?.[f.id] === "string"
          ? (existingPost[f.id] as string)
          : currentValues[f.id] || "";

      const grp = createFormGroup({
        type: f.type,
        id: f.id,
        name: f.id,
        label: f.label,
        value: fieldValue,
        options: f.options || [],
        placeholder: f.placeholder || ""
      });

      extraFieldsContainer.appendChild(grp);
    });
  }

  renderExtraFields(normalizedType);

  const submitBtn = Button({
    title: mode === "create" ? "Create" : "Update",
    id: "submit-post",
    classes: "buttonx",
    events: {
      click: async () => {
        const selectedType = (postTypeGroup.querySelector("select") as HTMLSelectElement)?.value || "";
        const typeKey = selectedType.toLowerCase();
        const cfg = PostTypes[typeKey] || PostTypes["standard"];
        if (!cfg?.fields) return;

        const title = (titleGroup.querySelector("input") as HTMLInputElement)?.value.trim() || "";
        const category = (categoryGroup.querySelector("select") as HTMLSelectElement)?.value.trim() || "";
        const subcategory = (subcategoryGroup.querySelector("select") as HTMLSelectElement)?.value.trim() || "";

        const formData = new FormData();
        formData.append("type", typeKey);
        formData.append("title", title);
        formData.append("category", category);
        formData.append("subcategory", subcategory);

        const rawTags = (hashtagsGroup.querySelector("input") as HTMLInputElement)?.value.trim() || "";
        if (rawTags) {
          rawTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
            .forEach((tag) => formData.append("hashtags", tag));
        }

        cfg.fields.forEach((f) => {
          const el = extraFieldsContainer.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${f.id}"]`);
          if (el && el.value.trim()) {
            formData.append(f.id, el.value.trim());
          }
        });

        formData.append(
          "blocks",
          JSON.stringify(blockManager.getSanitizedBlocks(), null, 2)
        );

        try {
          const res = await savePostRequest(formData, mode === "edit", postId);

          messageBox.replaceChildren(createElement("span", {}, ["Saved successfully"]));
          if (res?.postid) {
            navigate(`/post/${res.postid}`);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          messageBox.replaceChildren(
            createElement("span", {}, ["Error: " + message])
          );
        }
      }
    }
  });

  const form = createElement("div", { class: "post-editor" }, [
    postTypeGroup,
    titleGroup,
    hashtagsGroup,
    categoryGroup,
    subcategoryGroup,
    extraFieldsContainer,
    blocksContainer,
    addBlockButtons,
    blocksTextarea,
    submitBtn,
    messageBox
  ]);

  contentContainer.replaceChildren(
    createElement("div", { class: "create-section" }, [
      createElement("h2", {}, [`${capitalize(mode)} Post`]),
      form
    ])
  );
}

/* ---------------------- PUBLIC API ---------------------- */
export async function createPost(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  return renderPostEditor({ isLoggedIn, contentContainer, mode: "create" });
}

export async function editPost(
  isLoggedIn: boolean,
  postId: string | number,
  contentContainer: HTMLElement
): Promise<void> {
  return renderPostEditor({ isLoggedIn, postId, contentContainer, mode: "edit" });
}

export { renderPostEditor };