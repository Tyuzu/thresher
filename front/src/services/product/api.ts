import { apiFetch } from "../../api/api.js";

export interface ProductDetail {
  productid?: string;
  name?: string;
  description?: string;
  category?: string;
  price?: number | string;
  discount?: number | string;
  quantity?: number | string;
  unit?: string;
  type?: string;
  banner?: string;
  photo?: string;
  images?: string | string[];
  [key: string]: unknown;
}

export async function fetchProductById(
  productType: string,
  productId: string
): Promise<ProductDetail> {
  const safeType = (productType || "product").trim() || "product";
  const safeId = (productId || "").trim();

  if (!safeId) {
    throw new Error("Product not found.");
  }

  return await apiFetch<ProductDetail>(
    `/products/${encodeURIComponent(safeType)}/${encodeURIComponent(safeId)}`
  );
}

export default {
  fetchProductById
};
