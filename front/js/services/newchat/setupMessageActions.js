import { createElement } from "../../components/createElement.js";
import Imagex from "../../components/base/Imagex.js";

export function setupMessageActions(msg, socket) {
  const container = createElement("nav", {
    class: "msg-actions-container",
    "aria-label": "Message actions"
  });

  const triggerBtn = createElement("button", {
    class: "msg-actions-trigger",
    "aria-haspopup": "true",
    "aria-expanded": "false",
    "aria-label": "Open message actions menu"
  }, ["⋮"]);

  const dropdown = createElement("ul", {
    class: "msg-actions-dropdown hidden",
    role: "menu"
  });

  // --- Edit action ---
  if (msg.content) {
    const editItem = createElement("li", { role: "menuitem" }, [
      createElement("button", { class: "msg-action-item edit-item", "aria-label": "Edit message" }, ["Edit"])
    ]);
    editItem.firstChild.addEventListener("click", () => {
      const wrapper = document.getElementById(`msg-${msg.id || msg.messageid}`);
      if (!wrapper) {
        return;
      }

      const input = createElement("input", {
        type: "text",
        value: msg.content,
        class: "msg-edit-input",
        "aria-label": "Edit message text"
      });
      const saveBtn = createElement("button", { class: "msg-btn save-btn", "aria-label": "Save edited message" }, ["Save"]);

      saveBtn.addEventListener("click", () => {
        const newText = input.value.trim();
        if (newText && newText !== msg.content) {
          socket.send(JSON.stringify({ action: "edit", id: msg.id || msg.messageid, content: newText }));
        }
        wrapper.textContent = newText; // safer than innerHTML
      });

      // Clear existing content and append edit controls
      wrapper.innerHTML = "";
      wrapper.append(input, saveBtn);

      dropdown.classList.add("hidden");
      triggerBtn.setAttribute("aria-expanded", "false");
    });
    dropdown.appendChild(editItem);
  }

  // --- Delete action ---
  const deleteItem = createElement("li", { role: "menuitem" }, [
    createElement("button", { class: "msg-action-item delete-item", "aria-label": "Delete message" }, ["Delete"])
  ]);
  deleteItem.firstChild.addEventListener("click", () => {
    if (confirm("Delete this message?")) {
      socket.send(JSON.stringify({ action: "delete", id: msg.id || msg.messageid }));
    }
    dropdown.classList.add("hidden");
    triggerBtn.setAttribute("aria-expanded", "false");
  });
  dropdown.appendChild(deleteItem);

  // Toggle dropdown
  triggerBtn.addEventListener("click", () => {
    const isHidden = dropdown.classList.toggle("hidden");
    triggerBtn.setAttribute("aria-expanded", !isHidden);
  });

  container.append(triggerBtn, dropdown);
  return container;
}
