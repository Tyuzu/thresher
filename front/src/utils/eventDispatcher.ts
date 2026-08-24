/* =========================================================
   TYPES & INTERFACES
========================================================= */

export type ZoomBoxEventName =
  | "open"
  | "close"
  | "change"
  | "zoom"
  | "reset"
  | (string & {});

export type ZoomBoxEventDetail = Record<string, unknown>;

/* =========================================================
   EVENT DISPATCHER UTILITY
========================================================= */

/**
 * Dispatches a scoped custom event under the `zoombox:` namespace.
 * 
 * @param eventName - The specific action name (e.g., 'open', 'close', 'zoom')
 * @param detail - Optional payload object attached to event.detail
 */
export const dispatchZoomBoxEvent = <T extends ZoomBoxEventDetail = ZoomBoxEventDetail>(
  eventName: ZoomBoxEventName,
  detail: T = {} as T
): void => {
  const event = new CustomEvent<T>(`zoombox:${eventName}`, { detail });
  document.dispatchEvent(event);
};