import { displayProduct } from "../../services/product/productPage.js";

async function Product(isLoggedIn, t, productType, productId, contentContainer) {
    contentContainer.innerHTML = '';
    displayProduct(isLoggedIn, productType, productId, contentContainer);
}

export { Product };
