import { createElement } from "../../../components/createElement";
import Notify, { NotifyOptions } from "../../../components/ui/Notify";

/**
 * Clears all child nodes from a given DOM element.
 */
export function clearElement(el: HTMLElement): void {
    el.replaceChildren();
}

/**
 * Creates an HTML option element with specified value and text content.
 */
export function createOption(value: string | number, text: string): HTMLOptionElement {
    return createElement("option", { value: String(value) }, [text]) as HTMLOptionElement;
}

/**
 * Displays a global notification toast using the central Notify system.
 */
export function showToast(msg: string, options?: NotifyOptions): void {
    Notify(msg, {
        type: "success",
        dismissible: true,
        ...options
    });
}