export type ItemType = "product" | "tool";

export interface CategoryOption {
  value: string;
  label: string;
}

export interface FarmItem {
  productid: string;
  userid: string;
  name: string;
  category: string;
  price: number;
  discount?: number;
  quantity: number;
  unit?: string;
  sku?: string;
  availableFrom?: string;
  availableTo?: string;
  description?: string;
  featured?: boolean;
  banner?: string;
  images?: string | string[];
}

export interface ItemPayload {
  name: string;
  category: string;
  price: number;
  discount: number;
  quantity: number;
  unit: string;
  sku: string | null;
  availableFrom: string | null;
  availableTo: string | null;
  description: string;
  featured: boolean;
}

export interface DisplayItemsOptions {
  limit?: number;
  offset?: number;
  search?: string;
  category?: string;
  sort?: string;
}

export interface UserState {
  userid?: string;
  [key: string]: unknown;
}