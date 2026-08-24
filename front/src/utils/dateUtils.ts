/* =========================================================
   TYPES & INTERFACES
========================================================= */

export type DateInput = string | number | Date;

/* =========================================================
   DATE UTILITIES
========================================================= */

/**
 * Formats a given date/time input into a human-readable relative time string.
 *
 * @param dateInput - ISO string, timestamp number, or native Date object
 * @returns Formatted relative string (e.g., "just now", "5 min ago", "2h ago", "3d ago")
 */
export function formatRelativeTime(dateInput: DateInput): string {
  const timestamp = new Date(dateInput).getTime();

  // Handle invalid date inputs gracefully
  if (isNaN(timestamp)) {
    return "";
  }

  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${days}d ago`;
}