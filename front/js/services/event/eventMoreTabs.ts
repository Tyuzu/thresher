import { createElement } from "../../components/createElement.js";

export function displayEventNews(c, eventId, _isLoggedIn) {
    // c.replacechildren()
    c.appendChild(createElement("p",{},[`${eventId} News`]));
}