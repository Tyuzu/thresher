import { createElement } from "../../components/createElement.js";
import { ChatMessagePayload } from "./renderMessage.js";

export function setupMessageActions(
  msg: ChatMessagePayload,
  socket: WebSocket | null
): HTMLElement {
  const messageId = msg.id || msg.messageid;

  const container = createElement("nav", {
    class: "msg-actions-container",
    "aria-label": "Message actions"
  }) as HTMLElement;

  const triggerBtn = createElement(
    "button",
    {
      class: "msg-actions-trigger",
      "aria-haspopup": "true",
      "aria-expanded": "false",
      "aria-label": "Open message actions menu",
      type: "button"
    },
    ["⋮"]
  ) as HTMLButtonElement;

  const dropdown = createElement("ul", {
    class: "msg-actions-dropdown hidden",
    role: "menu"
  }) as HTMLElement;

  function onDocumentClick(e: MouseEvent): void {
    if (!container.contains(e.target as Node)) {
      closeMenu();
    }
  }

  function openMenu(): void {
    document.querySelectorAll(".msg-actions-dropdown").forEach(menu => {
      menu.classList.add("hidden");
    });
    document.querySelectorAll(".msg-actions-trigger").forEach(btn => {
      btn.setAttribute("aria-expanded", "false");
    });

    dropdown.classList.remove("hidden");
    triggerBtn.setAttribute("aria-expanded", "true");
    
    document.addEventListener("click", onDocumentClick);
  }

  function closeMenu(): void {
    dropdown.classList.add("hidden");
    triggerBtn.setAttribute("aria-expanded", "false");
    
    document.removeEventListener("click", onDocumentClick);
  }

  function sendSocket(data: object): boolean {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    socket.send(JSON.stringify(data));
    return true;
  }

  /* ---------- Edit ---------- */

  if (msg.content) {
    const editButton = createElement(
      "button",
      {
        type: "button",
        class: "msg-action-item edit-item",
        "aria-label": "Edit message"
      },
      ["Edit"]
    ) as HTMLButtonElement;

    editButton.addEventListener("click", () => {
      const wrapper = document.getElementById(`msg-${messageId}`);
      if (!wrapper) return;

      const textNode = wrapper.querySelector(".message-content");
      if (!textNode) return;

      const currentText = textNode.textContent?.trim() || "";

      const input = createElement("input", {
        type: "text",
        value: currentText,
        class: "msg-edit-input",
        "aria-label": "Edit message text"
      }) as HTMLInputElement;

      const saveBtn = createElement(
        "button",
        {
          type: "button",
          class: "msg-btn save-btn",
          "aria-label": "Save edited message"
        },
        ["Save"]
      ) as HTMLButtonElement;

      const cancelBtn = createElement(
        "button",
        {
          type: "button",
          class: "msg-btn cancel-btn",
          "aria-label": "Cancel editing"
        },
        ["Cancel"]
      ) as HTMLButtonElement;

      textNode.replaceWith(input);

      const cleanupEditUI = (replacementElement: HTMLElement): void => {
        input.replaceWith(replacementElement);
        saveBtn.remove();
        cancelBtn.remove();
      };

      const handleSave = (): void => {
        const newText = input.value.trim();

        if (!newText || newText === currentText) {
          handleCancel();
          return;
        }

        if (sendSocket({ action: "edit", id: messageId, content: newText })) {
          msg.content = newText; 

          const replacement = createElement(
            "span",
            { class: "message-content" },
            [newText]
          ) as HTMLElement;
          cleanupEditUI(replacement);
        }
      };

      const handleCancel = (): void => {
        const replacement = createElement(
          "span",
          { class: "message-content" },
          [currentText]
        ) as HTMLElement;
        cleanupEditUI(replacement);
      };

      input.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleSave();
        } else if (e.key === "Escape") {
          e.preventDefault();
          handleCancel();
        }
      });

      saveBtn.addEventListener("click", handleSave);
      cancelBtn.addEventListener("click", handleCancel);

      input.after(saveBtn, cancelBtn);
      closeMenu();

      requestAnimationFrame(() => {
        input.focus();
        input.select();
      });
    });

    const editItem = createElement("li", { role: "menuitem" }) as HTMLElement;
    editItem.appendChild(editButton);
    dropdown.appendChild(editItem);
  }

  /* ---------- Delete ---------- */

  const deleteButton = createElement(
    "button",
    {
      type: "button",
      class: "msg-action-item delete-item",
      "aria-label": "Delete message"
    },
    ["Delete"]
  ) as HTMLButtonElement;

  deleteButton.addEventListener("click", () => {
    if (!confirm("Delete this message?")) {
      return;
    }

    sendSocket({
      action: "delete",
      id: messageId
    });

    closeMenu();
  });

  const deleteItem = createElement("li", { role: "menuitem" }) as HTMLElement;
  deleteItem.appendChild(deleteButton);
  dropdown.appendChild(deleteItem);

  /* ---------- Menu Toggle ---------- */

  triggerBtn.addEventListener("click", (e: MouseEvent) => {
    e.stopPropagation();
    const isHidden = dropdown.classList.contains("hidden");

    if (isHidden) {
      openMenu();
    } else {
      closeMenu();
    }
  });

  container.append(triggerBtn, dropdown);

  return container;
}