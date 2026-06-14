export function createModal({
    title = "",
    className = "",
    bodyId = "",
    modalId = "",
    onClose = null
} = {}) {
    const modal = document.createElement("div");
    modal.className = ["modal", className].filter(Boolean).join(" ");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");

    if (modalId) {
        modal.id = modalId;
    }

    const content = document.createElement("div");
    content.className = "modal-content";

    const header = document.createElement("div");
    header.className = "modal-header";

    const titleEl = document.createElement("h2");
    titleEl.textContent = title;

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "close-btn";
    closeBtn.innerHTML = "&times;";

    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    const body = document.createElement("div");
    body.className = "modal-body";

    if (bodyId) {
        body.id = bodyId;
    }

    content.appendChild(header);
    content.appendChild(body);
    modal.appendChild(content);

    const close = () => {
        if (typeof onClose === "function") {
            onClose();
        }
        modal.remove();
    };

    closeBtn.addEventListener("click", close);

    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            close();
        }
    });

    return {
        modal,
        content,
        header,
        body,
        closeBtn,
        close
    };
}