import { createElement } from "../../components/createElement.js";
import { createAvatar, updateAvatar } from "./avatarPicture.js";

export { createAvatar, updateAvatar };

/* ============================================================
    PICTURE DISPATCH
============================================================ */

const PICTURE_HANDLERS = {
  avatar: updateAvatar
};

/**
 * Unified picture update handler
 * @param {'avatar'} type 
 * @returns {Promise<boolean>}
 */
export async function updateUserPicture(type) {
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
 * @param {string} label 
 * @param {string} id 
 * @param {string} type 
 * @param {string} [value=""] 
 * @returns {HTMLElement}
 */
export function generateFormField(label, id, type, value = "") {
  const wrapper = createElement("div", { class: "form-group" });
  const labelEl = createElement("label", { for: id }, [label]);

  const isTextArea = type === "textarea";
  const elementTag = isTextArea ? "textarea" : "input";
  
  const attributes = {
    id,
    name: id,
    ...(isTextArea ? { rows: 4 } : { type })
  };

  const inputEl = createElement(elementTag, attributes);
  inputEl.value = value;

  wrapper.appendChild(labelEl);
  wrapper.appendChild(inputEl);

  return wrapper;
}