export type EntityType =
  | "userhome"
  | "place"
  | "event"
  | "feedpost"
  | "media"
  | "ticket"
  | "merch"
  | "review"
  | "comment"
  | "like"
  | "favourite"
  | "booking"
  | "blogpost"
  | "collection";

export interface EntityItem {
  entity_id: string | number;
  created_at: string | number | Date;
  image_url?: string;
  caption?: string;
  [key: string]: any;
}

export interface TabStructure {
  mainTabButton: HTMLDivElement;
  tabSection: HTMLDivElement;
  childTabs: HTMLDivElement[];
  tabContentContainers: HTMLDivElement[];
}

export interface MainTabsResult {
  mainTabContainer: HTMLDivElement;
  mainTabButtons: HTMLDivElement;
  mainTabContents: HTMLDivElement;
}