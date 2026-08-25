import { createElement } from "../../../components/createElement.js";

export interface CreateModalOptions {
    title?: string;
    className?: string;
    bodyId?: string;
    modalId?: string;
    onClose?: (() => void) | null;
}

export interface CreateModalResult {
    modal: HTMLElement;
    content: HTMLElement;
    header: HTMLElement;
    body: HTMLElement;
    closeBtn: HTMLElement;
    close: () => void;
}

export function createModal({
    title = "",
    className = "",
    bodyId = "",
    modalId = "",
    onClose = null
}: CreateModalOptions = {}): CreateModalResult {
    let modal: HTMLElement;

    const close = () => {
        if (typeof onClose === "function") {
            onClose();
        }
        modal.remove();
    };

    const closeBtn = createElement("button", {
        type: "button",
        class: "close-btn",
        events: {
            click: () => close()
        }
    }) as HTMLElement;
    closeBtn.innerHTML = "&times;";

    const titleEl = createElement("h2", {}, title);
    const header = createElement("div", { class: "modal-header" }, [titleEl, closeBtn]) as HTMLElement;
    
    const bodyAttributes: Record<string, any> = bodyId ? { class: "modal-body", id: bodyId } : { class: "modal-body" };
    const body = createElement("div", bodyAttributes) as HTMLElement;

    const content = createElement("div", { class: "modal-content" }, [header, body]) as HTMLElement;

    const modalAttributes: Record<string, any> = {
        class: ["modal", className].filter(Boolean).join(" "),
        role: "dialog",
        "aria-modal": "true",
        events: {
            click: (event: MouseEvent) => {
                if (event.target === modal) {
                    close();
                }
            }
        }
    };
    if (modalId) {
        modalAttributes.id = modalId;
    }

    modal = createElement("div", modalAttributes, [content]) as HTMLElement;

    return {
        modal,
        content,
        header,
        body,
        closeBtn,
        close
    };
}