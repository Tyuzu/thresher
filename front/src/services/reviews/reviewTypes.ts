export interface Review {
  reviewid: string | number;
  userid: string;
  rating: number;
  comment: string;
  createdAt?: string | number | Date;
  __container?: HTMLElement;
}

export interface UserMeta {
  username?: string;
  [key: string]: any;
}

export type UserMetaMap = Record<string, UserMeta>;

export type OnDoneCallback = () => void;