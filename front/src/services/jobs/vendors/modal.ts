import { createElement } from "../../../components/createElement.js";

export function createModal({
    title = "",
    className = "",
    bodyId = "",
    modalId = "",
    onClose = null
} = {}) {
    const closeBtn = createElement("button", {
        type: "button",
        class: "close-btn",
        events: {
            click: () => close()
        }
    });
    closeBtn.innerHTML = "&times;";

    const titleEl = createElement("h2", {}, title);
    const header = createElement("div", { class: "modal-header" }, [titleEl, closeBtn]);
    
    const bodyAttributes = bodyId ? { class: "modal-body", id: bodyId } : { class: "modal-body" };
    const body = createElement("div", bodyAttributes);

    const content = createElement("div", { class: "modal-content" }, [header, body]);

    const modalAttributes = {
        class: ["modal", className].filter(Boolean).join(" "),
        role: "dialog",
        "aria-modal": "true",
        events: {
            click: (event) => {
                if (event.target === modal) {
                    close();
                }
            }
        }
    };
    if (modalId) {
        modalAttributes.id = modalId;
    }

    const modal = createElement("div", modalAttributes, [content]);

    const close = () => {
        if (typeof onClose === "function") {
            onClose();
        }
        modal.remove();
    };

    return {
        modal,
        content,
        header,
        body,
        closeBtn,
        close
    };
}