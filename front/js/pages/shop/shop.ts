import { displayShopping } from "../../services/shopping/shopping.ts";

async function Shop(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayShopping(contentContainer, isLoggedIn);
}

export { Shop };
