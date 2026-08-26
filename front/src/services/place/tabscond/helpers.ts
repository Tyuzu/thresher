// helpers.ts

import { createElement } from "../../../components/createElement.js";

// ---------------------------------
// FUNCTIONS
// ---------------------------------

export function showLoading(container: HTMLElement): void {
    container.appendChild(
        createElement("div", { class: "loading" }, [
            createElement("p", {}, ["Loading…"])
        ])
    );
}

export function showError(container: HTMLElement, message: string): void {
    container.appendChild(
        createElement("div", { class: "tab-section error" }, [
            createElement("p", {}, [message])
        ])
    );
    console.warn(message);
}