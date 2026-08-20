import { displayMerch } from "../../services/merch/merchPage.ts";

async function Merch(isLoggedIn, merchid, contentContainer) {
    contentContainer.innerHTML = '';
    displayMerch(contentContainer, merchid, isLoggedIn);
}

export { Merch };
