import { displayBazarBhav } from "../../services/crops/bazarbhav/bazaarBhav.ts";

async function BazaarBhav(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';
    displayBazarBhav(contentContainer, isLoggedIn);
}

export { BazaarBhav };
