import { createElement } from "../../components/createElement.js";

export function displayEventNews(
    c: HTMLElement, 
    eventId: string | number, 
    _isLoggedIn: boolean
): void {
    // c.replaceChildren();
    c.appendChild(createElement("p", {}, [`${eventId} News`]));
}