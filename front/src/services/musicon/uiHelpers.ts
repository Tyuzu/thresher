import { createElement } from "../../components/createElement.js";

export function getContentContainer(container: HTMLElement): HTMLElement {
    let content = container.querySelector(".music-content") as HTMLElement;
    if (!content) {
        content = createElement("div", { class: "music-content" });
        container.append(content);
    }
    return content;
}

export function showLoadingOverlay(content: HTMLElement, text: string = "Loading..."): void {
    let overlay = content.querySelector(".music-loading-overlay") as HTMLElement;

    if (!overlay) {
        const textNode = createElement("div", { class: "music-loading-text" }, [text]);

        overlay = createElement(
            "div",
            {
                class: "music-loading-overlay",
                style: "position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.8); z-index:9999;"
            },
            [textNode]
        ) as HTMLElement;

        const parentStyle = window.getComputedStyle(content);
        if (parentStyle.position === "static") {
            content.style.position = "relative";
        }

        content.append(overlay);
    } else {
        const textEl = overlay.querySelector(".music-loading-text");
        if (textEl) {
            while (textEl.firstChild) {
                textEl.removeChild(textEl.firstChild);
            }
            textEl.append(document.createTextNode(text));
        }
        overlay.style.display = "";
    }
}

export function hideLoadingOverlay(content: HTMLElement): void {
    const overlay = content.querySelector(".music-loading-overlay") as HTMLElement;
    if (overlay) {
        overlay.style.display = "none";
    }
}

export function setButtonTextSafely(btn: HTMLElement, text: string): void {
    while (btn.firstChild) {
        btn.removeChild(btn.firstChild);
    }
    btn.append(document.createTextNode(text));
}

export function createToolbarButton(text: string, onClick: () => void): HTMLElement {
    const btn = createElement("button", {}, [text]);
    btn.addEventListener("click", onClick);
    return btn;
}

export function createBackButton(container: HTMLElement, onClick: () => void): void {
    if (container.querySelector(".back-btn")) {
        return;
    }
    const backBtn = createElement("button", { class: "back-btn" }, ["⬅ Back"]);
    backBtn.addEventListener("click", onClick);
    container.prepend(backBtn);
}