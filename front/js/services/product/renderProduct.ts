// renderProduct.js

import { createElement } from "../../components/createElement.ts";
import { normalizeProduct } from "./productHelpers.ts";
import { renderProductGallery } from "./renderProductGallery.ts";
import { renderProductBasicInfo } from "./renderProductBasicInfo.ts";
import { renderProductActions } from "./renderProductActions.ts";

export function renderProduct(
  productOriginal,
  isLoggedIn,
  productType,
  productId,
  container,
  refresh
) {
  const product = normalizeProduct(productOriginal);

  const gallerySection = renderProductGallery(product);
  const basicInfo = renderProductBasicInfo(product);

  const actions = renderProductActions(
    product,
    productType,
    productId,
    container,
    refresh
  );

  const page = createElement("div", { class: "product-page" }, [
    gallerySection,
    basicInfo,
    actions,
  ]);

  return page;
}