// merchPage.ts
import { apiFetch } from "../../api/api.js";
import MerchCard from "../../components/ui/MerchCard.js";
import { Button } from "../../components/base/Button.js";
import { createElement } from "../../components/createElement.js";
import Modal from "../../components/ui/Modal.js";
import Notify from "../../components/ui/Notify.js";
import {
  EntityType,
  PictureType,
  resolveImagePath
} from "../../utils/imagePaths.js";
import { reportEntity } from "../reporting/reporting.js";
import { createFormGroup } from "../../components/form/createFormGroupEnhanced.js";
import { addToCart, isValidCartQuantity } from "../cart/addToCart.js";
import { getState } from "../../state/state.js";
import { showPaymentModal } from "../pay/pay.js";
import { confirmMerchPurchase } from "./api.js";
import { addMerchandise } from "./merchAPI.js";

// External declarations for unprovided helpers
declare function editMerchForm(entityType: string, merchId: string | number, eventId: string | number): void;
declare function deleteMerch(entityType: string, merchId: string | number, eventId: string | number): void;

export interface MerchItem {
  merchid: string | number;
  name: string;
  price: number;
  discount?: number;
  stock: number | string;
  merch_pic?: string;
  [key: string]: unknown;
}

export interface FormGroupField {
  label: string;
  type: string;
  id: string;
  placeholder?: string;
  required?: boolean;
  additionalProps?: Record<string, unknown>;
}

interface ModalInstance {
  close: () => void;
}


const MAX_CART_QUANTITY = 99;
const MAX_PURCHASE_NOTE_LENGTH = 1000;

function normalizeStock(value: unknown): number {
  const stock = Number(value);
  if (!Number.isFinite(stock) || stock <= 0) {
    return 0;
  }
  return Math.floor(stock);
}

function parseQuantity(value: unknown, maxStock: number): number | null {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > maxStock || !isValidCartQuantity(quantity)) {
    return null;
  }
  return quantity;
}

function setButtonBusy(button: HTMLButtonElement | null, busy: boolean): void {
  if (button) {
    button.disabled = busy;
  }
}

function encodePathSegment(value: unknown): string {
  return encodeURIComponent(String(value ?? ""));
}

// ------------------------------------------------------------
// Add Merchandise Form
// ------------------------------------------------------------
function addMerchForm(
  entityType: string,
  eventId: string | number,
  merchList: HTMLElement
): void {
  const form = createElement("form", {
    id: "add-merch-form",
    class: "create-section"
  }) as HTMLFormElement;

  const fields: FormGroupField[] = [
    { label: "Merchandise Name", type: "text", id: "merch-name", placeholder: "Merchandise Name", required: true },
    { label: "Price", type: "number", id: "merch-price", placeholder: "Price", required: true },
    { label: "Discount (%)", type: "number", id: "merch-discount", placeholder: "e.g. 10", additionalProps: { min: 0, max: 100, step: "0.01" } },
    { label: "Stock Available", type: "number", id: "merch-stock", placeholder: "Stock Available", required: true },
    { label: "Merch Image", type: "file", id: "merch-image", additionalProps: { accept: "image/*" } }
  ];

  fields.forEach((field) => {
    form.appendChild(createFormGroup(field));
  });

  const addBtn = createElement("button", {
    type: "submit",
    class: "buttonx"
  }, ["Add Merchandise"]) as HTMLButtonElement;

  form.appendChild(addBtn);

  const modal = Modal({
    title: "Add Merchandise",
    content: form
  }) as ModalInstance;

  let submitting = false;

  form.addEventListener("submit", async (event: SubmitEvent) => {
    event.preventDefault();
    if (submitting) return;

    submitting = true;
    addBtn.disabled = true;

    try {
      await addMerchandise(entityType, String(eventId), merchList);
      modal.close();
    } catch (error: any) {
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
async function displayMerchandise(
  container: HTMLElement,
  entityType: string,
  eventId: string | number,
  isCreator: boolean,
  isLoggedIn: boolean,
  merchData: MerchItem[] = []
): Promise<void> {
  container.replaceChildren();

  const heading = createElement("h2", {}, ["Merchandise"]);
  const merchList = createElement("div", {
    class: "merchcon hvflex"
  });

  container.appendChild(heading);
  container.appendChild(merchList);

  // Creator controls
  if (isCreator) {
    container.prepend(
      Button({
        title: "Add Merchandise",
        id: "add-merch-btn",
        classes: "buttonx",
        events: {
          click: () => addMerchForm(entityType, eventId, merchList)
        }
      })
    );
  }

  // Empty state
  if (!Array.isArray(merchData) || merchData.length === 0) {
    merchList.appendChild(
      createElement("p", {}, ["No merchandise available."])
    );
    return;
  }

  // Render merchandise
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

      onAddToCart: async () => {
        if (!isLoggedIn || !getState("token")) {
          Notify("Please log in to add items to cart.", { type: "warning", duration: 3000 });
          return;
        }

        if (stock <= 0) {
          Notify("This merchandise is out of stock.", { type: "warning", duration: 3000 });
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
        }) as HTMLInputElement;

        const wrapper = createElement(
          "div",
          { class: "modal-form-group" },
          [
            createElement("label", {}, ["Quantity: ", quantityInput]),
            createElement("small", {}, [`Maximum: ${maxQuantity}`])
          ]
        );

        let adding = false;
        const modal = Modal({
          title: `Add ${merch.name || "Merchandise"} to Cart`,
          content: wrapper,
          actions: () =>
            createElement(
              "div",
              { class: "modal-actions" },
              [
                Button({
                  title: "Add to Cart",
                  classes: "buttonx primary",
                  events: {
                    click: async () => {
                      if (adding) return;

                      const quantity = parseQuantity(quantityInput.value, maxQuantity);
                      if (quantity === null) {
                        Notify(`Enter a valid quantity from 1-${maxQuantity}.`, {
                          type: "warning",
                          duration: 3000
                        });
                        return;
                      }

                      adding = true;
                      const buttons = wrapper.parentElement?.querySelectorAll<HTMLButtonElement>("button");
                      if (buttons?.length) {
                        setButtonBusy(buttons[0], true);
                      }

                      try {
                        const success = await addToCart({
                          itemId: merch.merchid,
                          quantity,
                          isLoggedIn: Boolean(getState("token")),
                          onCartUpdated: (response: unknown) => {
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
                          setButtonBusy(buttons[0], false);
                        }
                      }
                    }
                  }
                }),
                Button({
                  title: "Cancel",
                  classes: "buttonx",
                  events: {
                    click: () => modal.close()
                  }
                })
              ]
            )
        }) as ModalInstance;
      },

      onBuy: async () => {
        if (!isLoggedIn || !getState("token")) {
          Notify("Please log in to purchase merchandise.", { type: "warning", duration: 3000 });
          return;
        }

        if (stock <= 0) {
          Notify("This merchandise is out of stock.", { type: "warning", duration: 3000 });
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
        }) as HTMLInputElement;

        const noteInput = createElement("textarea", {
          placeholder: "Special request (optional)",
          rows: 3,
          maxlength: String(MAX_PURCHASE_NOTE_LENGTH)
        }) as HTMLTextAreaElement;

        const wrapper = createElement(
          "div",
          { class: "modal-form-group" },
          [
            createElement("label", {}, ["Quantity: ", quantityInput]),
            createElement("label", {}, ["Note: ", noteInput])
          ]
        );

        let purchasing = false;
        const modal = Modal({
          title: `Purchase ${merch.name || "Merchandise"}`,
          content: wrapper,
          actions: () =>
            createElement(
              "div",
              { class: "modal-actions" },
              [
                Button({
                  title: "Proceed to Payment",
                  classes: "buttonx primary",
                  events: {
                    click: async () => {
                      if (purchasing) return;

                      const quantity = parseQuantity(quantityInput.value, maxQuantity);
                      if (quantity === null) {
                        Notify(`Enter a valid quantity from 1-${maxQuantity}.`, {
                          type: "warning",
                          duration: 3000
                        });
                        return;
                      }

                      const note = String(noteInput.value || "")
                        .trim()
                        .slice(0, MAX_PURCHASE_NOTE_LENGTH);

                      purchasing = true;
                      modal.close();

                      try {
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

                        const resp = await confirmMerchPurchase(
                          entityType,
                          eventId,
                          merch.merchid,
                          { quantity, note }
                        );

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
                  }
                }),
                Button({
                  title: "Cancel",
                  classes: "buttonx",
                  events: {
                    click: () => modal.close()
                  }
                })
              ]
            )
        }) as ModalInstance;
      },

      onEdit: () => editMerchForm(entityType, merch.merchid, eventId),
      onDelete: () => deleteMerch(entityType, merch.merchid, eventId),
      onReport: () => reportEntity(String(merch.merchid), "merch", entityType, String(eventId))
    });

    merchList.appendChild(card);
  });
}

export { setButtonBusy, addMerchForm, displayMerchandise };