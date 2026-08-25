import { createElement } from "../../components/createElement.js";
import { createAvatar, updateAvatar } from "./avatarPicture.js";

export { createAvatar, updateAvatar };

/* ============================================================
    PICTURE DISPATCH
============================================================ */

type PictureTypeKey = "avatar";
type PictureHandler = () => Promise<boolean>;

const PICTURE_HANDLERS: Record<PictureTypeKey, PictureHandler> = {
  avatar: updateAvatar
};

/**
 * Unified picture update handler
 */
export async function updateUserPicture(type: PictureTypeKey): Promise<boolean> {
  const handler = PICTURE_HANDLERS[type];

  if (!handler) {
    console.error(`Unknown picture type: ${type}`);
    return false;
  }

  return handler();
}

/* ============================================================
    FORM HELPERS
============================================================ */

/**
 * Generates a form group element containing a label and input/textarea
 */
export function generateFormField(
  label: string,
  id: string,
  type: string,
  value: string = ""
): HTMLElement {
  const wrapper = createElement("div", { class: "form-group" });
  const labelEl = createElement("label", { for: id }, [label]);

  const isTextArea = type === "textarea";
  const elementTag = isTextArea ? "textarea" : "input";
  
  const attributes: Record<string, string | number> = {
    id,
    name: id,
    ...(isTextArea ? { rows: 4 } : { type })
  };

  const inputEl = createElement(elementTag, attributes) as HTMLInputElement | HTMLTextAreaElement;
  inputEl.value = value;

  wrapper.appendChild(labelEl);
  wrapper.appendChild(inputEl);

  return wrapper;
}