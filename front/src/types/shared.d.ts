export interface UserProfile {
  userid: string | number;
  username?: string;
  displayName?: string;
  avatar?: string;
  [key: string]: any;
}

export interface Place {
  placeid?: string | number;
  name?: string;
  address?: string;
  created_at?: string | number;
  updated_at?: string | number;
  [key: string]: any;
}

export interface MediaItem {
  mediaid?: string | number;
  url?: string;
  type?: string;
  thumbnail?: string;
  width?: number;
  height?: number;
  [key: string]: any;
}

export interface Message {
  messageid?: string | number;
  sender?: string | number | UserProfile;
  text?: string;
  media?: MediaItem | MediaItem[];
  createdAt?: string | number;
  [key: string]: any;
}

export interface Song {
  songid?: string | number;
  title?: string;
  artist?: string;
  duration?: number;
  [key: string]: any;
}

export interface Player {
  id?: string;
  currentSong?: Song | null;
  playing?: boolean;
  [key: string]: any;
}

export interface BookingItem {
  id?: string;
  userid?: string;
  entityType?: string;
  entityId?: string;
  slotId?: string;
  tierId?: string;
  tierName?: string;
  date?: string;
  start?: string;
  end?: string;
  seats?: number;
  pricePaid?: number;
  status?: string;
  [key: string]: any;
}

export interface PricingTier {
  id?: string;
  entityType?: string;
  entityId?: string;
  name?: string;
  price?: number;
  capacity?: number;
  timeRange?: [string, string];
  daysOfWeek?: number[];
  features?: string[];
  createdAt?: number;
  [key: string]: any;
}

export interface BookingSlot {
  id?: string;
  date?: string;
  start?: string;
  end?: string;
  capacity?: number;
  tierId?: string;
  tierName?: string;
  [key: string]: any;
}

export interface OrderItem {
  id?: string | number;
  name?: string;
  quantity?: number;
  price?: number;
  [key: string]: any;
}

export interface Order {
  orderid?: string | number;
  orderType?: string;
  createdAt?: string | number;
  paymentMethod?: string;
  address?: any;
  items?: OrderItem[];
  [key: string]: any;
}

export interface EventData {
  id?: string | number;
  eventid?: string | number;
  creatorid?: string | number;
  date?: string | Date;
  seating?: any;
  contactInfo?: any;
  [key: string]: any;
}

export interface EventDetailData extends EventData {
  eventid: string | number;
}

export interface EventSeatingData extends EventData {
  eventid: string | number;
  seating: any;
}
