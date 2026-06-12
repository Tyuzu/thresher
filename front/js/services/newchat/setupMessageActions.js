import { createElement } from "../../components/createElement.js";

export function setupMessageActions(
  msg,
  socket
) {
  const messageId =
    msg.id || msg.messageid;

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
      "aria-label":
        "Open message actions menu",
      type: "button"
    },
    ["⋮"]
  );

  const dropdown = createElement("ul", {
    class:
      "msg-actions-dropdown hidden",
    role: "menu"
  });

  function closeMenu() {
    dropdown.classList.add("hidden");

    triggerBtn.setAttribute(
      "aria-expanded",
      "false"
    );
  }

  function sendSocket(data) {
    if (
      !socket ||
      socket.readyState !==
        WebSocket.OPEN
    ) {
      return false;
    }

    socket.send(
      JSON.stringify(data)
    );

    return true;
  }

  /* ---------- Edit ---------- */

  if (msg.content) {
    const editButton =
      createElement(
        "button",
        {
          type: "button",
          class:
            "msg-action-item edit-item",
          "aria-label":
            "Edit message"
        },
        ["Edit"]
      );

    editButton.addEventListener(
      "click",
      () => {
        const wrapper =
          document.getElementById(
            `msg-${messageId}`
          );

        if (!wrapper) {
          return;
        }

        const textNode =
          wrapper.querySelector(
            ".message-content"
          );

        if (!textNode) {
          return;
        }

        const originalText =
          msg.content;

        const input =
          createElement("input", {
            type: "text",
            value: originalText,
            class:
              "msg-edit-input",
            "aria-label":
              "Edit message text"
          });

        const saveBtn =
          createElement(
            "button",
            {
              type: "button",
              class:
                "msg-btn save-btn",
              "aria-label":
                "Save edited message"
            },
            ["Save"]
          );

        const cancelBtn =
          createElement(
            "button",
            {
              type: "button",
              class:
                "msg-btn cancel-btn",
              "aria-label":
                "Cancel editing"
            },
            ["Cancel"]
          );

        const originalContent =
          textNode.textContent;

        textNode.replaceWith(
          input
        );

        saveBtn.addEventListener(
          "click",
          () => {
            const newText =
              input.value.trim();

            if (
              !newText ||
              newText ===
                originalText
            ) {
              cancelBtn.click();
              return;
            }

            if (
              sendSocket({
                action: "edit",
                id: messageId,
                content: newText
              })
            ) {
              const replacement =
                createElement(
                  "span",
                  {
                    class:
                      "message-content"
                  },
                  [newText]
                );

              input.replaceWith(
                replacement
              );

              saveBtn.remove();
              cancelBtn.remove();
            }
          }
        );

        cancelBtn.addEventListener(
          "click",
          () => {
            const replacement =
              createElement(
                "span",
                {
                  class:
                    "message-content"
                },
                [originalContent]
              );

            input.replaceWith(
              replacement
            );

            saveBtn.remove();
            cancelBtn.remove();
          }
        );

        input.after(
          saveBtn,
          cancelBtn
        );

        closeMenu();

        requestAnimationFrame(
          () => {
            input.focus();
            input.select();
          }
        );
      }
    );

    const editItem =
      createElement("li", {
        role: "menuitem"
      });

    editItem.appendChild(
      editButton
    );

    dropdown.appendChild(
      editItem
    );
  }

  /* ---------- Delete ---------- */

  const deleteButton =
    createElement(
      "button",
      {
        type: "button",
        class:
          "msg-action-item delete-item",
        "aria-label":
          "Delete message"
      },
      ["Delete"]
    );

  deleteButton.addEventListener(
    "click",
    () => {
      if (
        !confirm(
          "Delete this message?"
        )
      ) {
        return;
      }

      sendSocket({
        action: "delete",
        id: messageId
      });

      closeMenu();
    }
  );

  const deleteItem =
    createElement("li", {
      role: "menuitem"
    });

  deleteItem.appendChild(
    deleteButton
  );

  dropdown.appendChild(
    deleteItem
  );

  /* ---------- Menu ---------- */

  triggerBtn.addEventListener(
    "click",
    e => {
      e.stopPropagation();

      const opening =
        dropdown.classList.contains(
          "hidden"
        );

      document
        .querySelectorAll(
          ".msg-actions-dropdown"
        )
        .forEach(menu => {
          menu.classList.add(
            "hidden"
          );
        });

      document
        .querySelectorAll(
          ".msg-actions-trigger"
        )
        .forEach(btn => {
          btn.setAttribute(
            "aria-expanded",
            "false"
          );
        });

      if (opening) {
        dropdown.classList.remove(
          "hidden"
        );

        triggerBtn.setAttribute(
          "aria-expanded",
          "true"
        );
      }
    }
  );

  document.addEventListener(
    "click",
    closeMenu
  );

  container.append(
    triggerBtn,
    dropdown
  );

  return container;
}