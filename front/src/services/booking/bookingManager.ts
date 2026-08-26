// Canonical booking slot definition

export interface BookingItem {
  id: string;
  userid: string;
  entityType: string;
  entityId: string;
  slotId?: string;
  tierId?: string;
  tierName?: string;
  date: string;
  start: string;
  end?: string;
  seats?: number;
  pricePaid?: number;
  status?: string;
  [key: string]: any;
}

export interface PricingTier {
  id: string;
  entityType: string;
  entityId: string;
  name: string;
  price: number;
  capacity: number;
  timeRange?: [string, string];
  daysOfWeek?: number[];
  features?: string[];
  createdAt?: number;
  [key: string]: any;
}

export interface BookingSlot {
  id: string;
  date: string;
  start: string;
  end?: string;
  capacity: number;
  tierId?: string;
  tierName?: string;
  [key: string]: any;
}
