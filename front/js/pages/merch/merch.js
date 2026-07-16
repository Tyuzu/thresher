import { displayMerch } from "../../services/merch/merchPage.js";

async function Merch(isLoggedIn, t, merchid, contentContainer) {
    contentContainer.innerHTML = '';
    displayMerch(contentContainer, merchid, isLoggedIn);
}

export { Merch };
