// merchPage.js
import {
  apiFetch
} from "../../api/api.ts";
import MerchCard from "../../components/ui/MerchCard.ts";
import {
  Button
} from "../../components/base/Button.ts";
import {
  createElement
} from "../../components/createElement.ts";
import Modal from "../../components/ui/Modal.ts";
import Notify from "../../components/ui/Notify.ts";
import {
  EntityType,
  PictureType,
  resolveImagePath
} from "../../utils/imagePaths.ts";
import {
  reportEntity
} from "../reporting/reporting.ts";
import {
  createFormGroup
} from "../../components/createFormGroupEnhanced.ts";
import {
  addToCart,
  isValidCartQuantity
} from "../cart/addToCart.ts";
import {
  getState
} from "../../state/state.ts";
import {
  showPaymentModal
} from "../pay/pay.ts";
import {
  addMerchandise
} from "./merchAPI.ts";
const MAX_CART_QUANTITY = 99;
const MAX_PURCHASE_NOTE_LENGTH = 1000;
/**
 * Normalize a stock value received from the backend.
 *
 * This is only for UI validation.
 * The backend must remain authoritative for inventory.
 */
function normalizeStock(value) {
  const stock = Number(value);
  if (!Number.isFinite(stock) || stock <= 0) {
    return 0;
  }
  return Math.floor(stock);
}
/**
 * Parse and validate a user-entered quantity.
 */
function parseQuantity(value, maxStock) {
  const quantity = Number(value);
  if (!Number.isInteger(quantity)) {
    return null;
  }
  if (quantity < 1) {
    return null;
  }
  if (quantity > maxStock) {
    return null;
  }
  if (!isValidCartQuantity(quantity)) {
    return null;
  }
  return quantity;
}
/**
 * Disable/enable a button while an async mutation is running.
 */
function setButtonBusy(button, busy) {
  if (!button) {
    return;
  }
  button.disabled = busy;
}
/**
 * Safely build a path segment.
 */
function encodePathSegment(value) {
  return encodeURIComponent(String(value ?? ""));
}
// ------------------------------------------------------------
// Add Merchandise Form
// ------------------------------------------------------------
function addMerchForm(entityType, eventId, merchList) {
  const form = createElement("form", {
    id: "add-merch-form",
    class: "create-section"
  });
  const fields = [{
    label: "Merchandise Name",
    type: "text",
    id: "merch-name",
    placeholder: "Merchandise Name",
    required: true
  }, {
    label: "Price",
    type: "number",
    id: "merch-price",
    placeholder: "Price",
    required: true
  }, {
    label: "Discount (%)",
    type: "number",
    id: "merch-discount",
    placeholder: "e.g. 10",
    additionalProps: {
      min: 0,
      max: 100,
      step: "0.01"
    }
  }, {
    label: "Stock Available",
    type: "number",
    id: "merch-stock",
    placeholder: "Stock Available",
    required: true
  }, {
    label: "Merch Image",
    type: "file",
    id: "merch-image",
    additionalProps: {
      accept: "image/*"
    }
  }];
  fields.forEach((field) => {
    form.appendChild(createFormGroup(field));
  });
  const addBtn = createElement("button", {
    type: "submit",
    class: "buttonx"
  },
    ["Add Merchandise"]);
  form.appendChild(addBtn);
  const {
    close: closeModal
  } = Modal({
    title: "Add Merchandise",
    content: form
  });
  let submitting = false;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) {
      return;
    }
    submitting = true;
    addBtn.disabled = true;
    try {
      await addMerchandise(entityType, eventId, merchList);
      closeModal();
    } catch (error) {
      console.error("Failed to add merchandise:", error);
      Notify(error?.message || "Failed to add merchandise.", {
        type: "error",
        duration: 3000
      });
    } finally {
      submitting = false;
      addBtn.disabled = false;
    }
  });
}
// ------------------------------------------------------------
// Display Merchandise List
// ------------------------------------------------------------
async function displayMerchandise(container, entityType, eventId, isCreator, isLoggedIn, merchData = []) {
  container.replaceChildren();
  const heading = createElement("h2", {},
    ["Merchandise"]);
  const merchList = createElement("div", {
    class: "merchcon hvflex"
  });
  container.appendChild(heading);
  container.appendChild(merchList);
  // ----------------------------------------------------------
  // Creator controls
  // ----------------------------------------------------------
  if (isCreator) {
    container.prepend(Button("Add Merchandise", "add-merch-btn", {
      click: () => addMerchForm(entityType, eventId, merchList)
    }, "buttonx"));
  }
  // ----------------------------------------------------------
  // Empty state
  // ----------------------------------------------------------
  if (!Array.isArray(merchData) || merchData.length === 0) {
    merchList.appendChild(createElement("p", {},
      ["No merchandise available."]));
    return;
  }
  // ----------------------------------------------------------
  // Render merchandise
  // ----------------------------------------------------------
  merchData.forEach((merch) => {
    const stock = normalizeStock(merch.stock);
    const card = MerchCard({
      name: merch.name,
      price: merch.price,
      discount: merch.discount || 0,
      image: resolveImagePath(EntityType.MERCH, PictureType.THUMB, merch.merch_pic),
      stock,
      isCreator,
      isLoggedIn,
      // ------------------------------------------------------
      // Add to Cart
      // ------------------------------------------------------
      onAddToCart: async () => {
        if (!isLoggedIn || !getState("token")) {
          Notify("Please log in to add items to cart.", {
            type: "warning",
            duration: 3000
          });
          return;
        }
        if (stock <= 0) {
          Notify("This merchandise is out of stock.", {
            type: "warning",
            duration: 3000
          });
          return;
        }
        const maxQuantity = Math.min(stock, MAX_CART_QUANTITY);
        const quantityInput = createElement("input", {
          type: "number",
          min: "1",
          max: String(maxQuantity),
          step: "1",
          value: "1",
          inputmode: "numeric",
          "aria-label": "Merchandise quantity"
        });
        const wrapper = createElement("div", {
          class: "modal-form-group"
        },
          [
            createElement("label", {},
              ["Quantity: ",
                quantityInput
              ]),
            createElement("small", {},
              [`Maximum: ${maxQuantity}`])
          ]);
        let adding = false;
        const modal = Modal({
          title: `Add ${merch.name ||
            "Merchandise"
            } to Cart`,
          content: wrapper,
          actions: () => createElement("div", {
            class: "modal-actions"
          },
            [
              Button("Add to Cart", "", {
                click: async () => {
                  if (adding) {
                    return;
                  }
                  const quantity = parseQuantity(quantityInput.value, maxQuantity);
                  if (quantity === null) {
                    Notify(`Enter a valid quantity from 1-${maxQuantity}.`, {
                      type: "warning",
                      duration: 3000
                    });
                    return;
                  }
                  adding = true;
                  /**
                   * Find the actual action
                   * button from the modal.
                   *
                   * The cart operation itself
                   * remains the single source of
                   * truth for cart mutation.
                   */
                  const buttons = wrapper.parentElement?.querySelectorAll?.("button");
                  if (buttons?.length) {
                    buttons[0].disabled = true;
                  }
                  try {
                    /**
                     * NEW CART CONTRACT
                     *
                     * Only send:
                     *
                     *   itemId
                     *   quantity
                     *
                     * The server should resolve
                     * item type, name, price,
                     * category and ownership.
                     */
                    const success = await addToCart({
                      itemId: merch.merchid,
                      quantity,
                      isLoggedIn: Boolean(getState("token")),
                      onCartUpdated: (response) => {
                        console.debug("Merch cart updated:", response);
                      }
                    });
                    if (success) {
                      modal.close();
                    }
                  } catch (error) {
                    console.error("Failed to add merchandise to cart:", error);
                  } finally {
                    adding = false;
                    if (buttons?.length) {
                      buttons[0].disabled = false;
                    }
                  }
                }
              }, "buttonx primary"),
              Button("Cancel", "", {
                click: () => modal.close()
              }, "buttonx")
            ])
        });
      },
      // ------------------------------------------------------
      // Buy Now
      // ------------------------------------------------------
      onBuy: async () => {
        if (!isLoggedIn || !getState("token")) {
          Notify("Please log in to purchase merchandise.", {
            type: "warning",
            duration: 3000
          });
          return;
        }
        if (stock <= 0) {
          Notify("This merchandise is out of stock.", {
            type: "warning",
            duration: 3000
          });
          return;
        }
        const maxQuantity = Math.min(stock, MAX_CART_QUANTITY);
        const quantityInput = createElement("input", {
          type: "number",
          min: "1",
          max: String(maxQuantity),
          step: "1",
          value: "1",
          inputmode: "numeric"
        });
        const noteInput = createElement("textarea", {
          placeholder: "Special request (optional)",
          rows: 3,
          maxlength: String(MAX_PURCHASE_NOTE_LENGTH)
        });
        const wrapper = createElement("div", {
          class: "modal-form-group"
        },
          [
            createElement("label", {},
              ["Quantity: ",
                quantityInput
              ]),
            createElement("label", {},
              ["Note: ",
                noteInput
              ])
          ]);
        let purchasing = false;
        const modal = Modal({
          title: `Purchase ${merch.name ||
            "Merchandise"
            }`,
          content: wrapper,
          actions: () => createElement("div", {
            class: "modal-actions"
          },
            [
              Button("Proceed to Payment", "", {
                click: async () => {
                  if (purchasing) {
                    return;
                  }
                  const quantity = parseQuantity(quantityInput.value, maxQuantity);
                  if (quantity === null) {
                    Notify(`Enter a valid quantity from 1-${maxQuantity}.`, {
                      type: "warning",
                      duration: 3000
                    });
                    return;
                  }
                  const note = String(noteInput.value || "").trim().slice(0, MAX_PURCHASE_NOTE_LENGTH);
                  purchasing = true;
                  modal.close();
                  try {
                    /**
                     * Payment is deliberately kept
                     * separate from cart mutation.
                     */
                    const paymentResult = await showPaymentModal({
                      paymentType: "purchase",
                      entityType: "merch",
                      entityId: merch.merchid,
                      entityName: merch.name
                    });
                    if (!paymentResult || paymentResult.success !== true) {
                      Notify("Payment cancelled or failed.", {
                        type: "warning",
                        duration: 3000
                      });
                      return;
                    }
                    /**
                     * Keep entityType/eventId in
                     * this endpoint because this is
                     * the existing merchandise purchase
                     * API, not the cart API.
                     *
                     * Values are URL encoded to avoid
                     * malformed path segments.
                     */
                    const purchaseUrl = `/merch/${encodePathSegment(
                      entityType
                    )}/${encodePathSegment(
                      eventId
                    )}/${encodePathSegment(
                      merch.merchid
                    )}/confirm-purchase`;
                    const resp = await apiFetch(purchaseUrl, "POST", {
                      quantity,
                      note
                    });
                    if (resp?.success) {
                      Notify("Merchandise purchased successfully!", {
                        type: "success",
                        duration: 3000
                      });
                    } else {
                      Notify(resp?.message || "Purchase failed.", {
                        type: "error",
                        duration: 3000
                      });
                    }
                  } catch (error) {
                    console.error("Purchase error:", error);
                    Notify("Purchase failed. Please try again.", {
                      type: "error",
                      duration: 3000
                    });
                  } finally {
                    purchasing = false;
                  }
                }
              }, "buttonx primary"),
              Button("Cancel", "", {
                click: () => modal.close()
              }, "buttonx")
            ])
        });
      },
      // ------------------------------------------------------
      // Creator actions
      // ------------------------------------------------------
      onEdit: () => editMerchForm(entityType, merch.merchid, eventId),
      onDelete: () => deleteMerch(entityType, merch.merchid, eventId),
      // ------------------------------------------------------
      // Reporting
      // ------------------------------------------------------
      onReport: () => reportEntity(merch.merchid, "merch", entityType, eventId)
    });
    merchList.appendChild(card);
  });
}
export {
  addMerchForm,
  displayMerchandise
};