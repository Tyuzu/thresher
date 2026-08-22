import { createElement } from "../../components/createElement.js";

export function setupMessageActions(msg, socket) {
  const messageId = msg.id || msg.messageid;

  const container = createElement("nav", {
    class: "msg-actions-container",
    "aria-label": "Message actions"
  });

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
  );

  const dropdown = createElement("ul", {
    class: "msg-actions-dropdown hidden",
    role: "menu"
  });

  // FIXED: Handle global click-away safely without multiplying listeners
  function onDocumentClick(e) {
    if (!container.contains(e.target)) {
      closeMenu();
    }
  }

  function openMenu() {
    // Hide all other open menus first
    document.querySelectorAll(".msg-actions-dropdown").forEach(menu => {
      menu.classList.add("hidden");
    });
    document.querySelectorAll(".msg-actions-trigger").forEach(btn => {
      btn.setAttribute("aria-expanded", "false");
    });

    dropdown.classList.remove("hidden");
    triggerBtn.setAttribute("aria-expanded", "true");
    
    // Bind click-away only when open
    document.addEventListener("click", onDocumentClick);
  }

  function closeMenu() {
    dropdown.classList.add("hidden");
    triggerBtn.setAttribute("aria-expanded", "false");
    
    // Clean up global listener immediately on close
    document.removeEventListener("click", onDocumentClick);
  }

  function sendSocket(data) {
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
    );

    editButton.addEventListener("click", () => {
      const wrapper = document.getElementById(`msg-${messageId}`);
      if (!wrapper) return;

      const textNode = wrapper.querySelector(".message-content");
      if (!textNode) return;

      // FIXED: Pull text directly from the DOM to avoid old cached msg.content values
      const currentText = textNode.textContent.trim();

      const input = createElement("input", {
        type: "text",
        value: currentText,
        class: "msg-edit-input",
        "aria-label": "Edit message text"
      });

      const saveBtn = createElement(
        "button",
        {
          type: "button",
          class: "msg-btn save-btn",
          "aria-label": "Save edited message"
        },
        ["Save"]
      );

      const cancelBtn = createElement(
        "button",
        {
          type: "button",
          class: "msg-btn cancel-btn",
          "aria-label": "Cancel editing"
        },
        ["Cancel"]
      );

      textNode.replaceWith(input);

      const cleanupEditUI = (replacementElement) => {
        input.replaceWith(replacementElement);
        saveBtn.remove();
        cancelBtn.remove();
      };

      const handleSave = () => {
        const newText = input.value.trim();

        if (!newText || newText === currentText) {
          handleCancel();
          return;
        }

        if (sendSocket({ action: "edit", id: messageId, content: newText })) {
          // FIXED: Sync local model state so subsequent UI passes match the server
          msg.content = newText; 

          const replacement = createElement(
            "span",
            { class: "message-content" },
            [newText]
          );
          cleanupEditUI(replacement);
        }
      };

      const handleCancel = () => {
        const replacement = createElement(
          "span",
          { class: "message-content" },
          [currentText]
        );
        cleanupEditUI(replacement);
      };

      // FIXED: Added Enter / Escape keyboard listeners
      input.addEventListener("keydown", e => {
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

    const editItem = createElement("li", { role: "menuitem" });
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
  );

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

  const deleteItem = createElement("li", { role: "menuitem" });
  deleteItem.appendChild(deleteButton);
  dropdown.appendChild(deleteItem);

  /* ---------- Menu Toggle ---------- */

  triggerBtn.addEventListener("click", e => {
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