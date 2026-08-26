export interface PlaceCoordinates {
  lat?: number;
  lng?: number;
}

export interface Place {
  placeid?: string | number;
  createdBy?: string | number;
  name?: string;
  banner?: string;
  description?: string;
  address?: string;
  category?: string;
  short_desc?: string;
  capacity?: number;
  tags?: string[];
  coordinates?: PlaceCoordinates;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
  [key: string]: unknown;
}
