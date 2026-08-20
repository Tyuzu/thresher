import "../../../css/farmstyles/productpage.css";
import { displayProduct } from "../../services/product/productPage.ts";

async function Product(isLoggedIn, productType, productId, contentContainer) {
    contentContainer.innerHTML = '';
    displayProduct(isLoggedIn, productType, productId, contentContainer);
}

export { Product };
