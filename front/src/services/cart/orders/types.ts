export type RefundStatus = "pending" | "approved" | "rejected" | "completed" | "none";
export type OrderType = "farm" | "regular";

export interface RefundRequest {
  id: string;
  order_id: string;
  user_id: string;
  amount: number;
  reason?: string;
  status: RefundStatus;
  created_at?: string;
  createdAt?: string;
  order_type?: OrderType;
  review_notes?: string;
  reviewed_by?: string;
}

export interface OrderItem {
  entityName?: string;
  itemName?: string;
  quantity?: number;
  price?: number;
}

export interface OrderItemsStructure {
  products?: OrderItem[];
  [category: string]: OrderItem[] | undefined;
}

export interface Order {
  id?: string;
  orderId: string;
  orderid?: string;
  OrderID?: string;
  orderType: OrderType | string;
  createdAt: string | number;
  created_at?: string;
  createdTime?: string;
  timestamp?: number;
  status: string;
  orderStatus?: string;
  paymentMethod: string;
  payment?: string;
  paymentStatus?: string;
  address: string;
  deliveryAddress?: string;
  shippingAddress?: string;
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  delivery: number;
  approvedBy: string[];
  farmId: string;
  farmid?: string;
  items: OrderItemsStructure;
  refundStatus?: RefundStatus;
}

export interface OrderFilters {
  status: string;
  date: string;
}

export interface OrderPageState {
  orders: Order[];
  filters: OrderFilters;
  currentPage: number;
  expandedOrders: Set<string>;
}

export type StateMutatedCallback = () => void;