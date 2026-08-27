import { createElement } from "../createElement.js";

export interface TimeSlot {
  enabled?: boolean;
  from?: string; // Format "HH:mm"
  to?: string;   // Format "HH:mm"
}

export type AvailabilitySchedule = Record<string, TimeSlot | undefined>;

export interface StatusResult {
  open: boolean;
  text: string;
}

export interface NextOpening {
  label: string;
  time: string;
}

const DAYS: [string, string][] = [
  ["monday", "Mon."],
  ["tuesday", "Tue."],
  ["wednesday", "Wed."],
  ["thursday", "Thu."],
  ["friday", "Fri."],
  ["saturday", "Sat."],
  ["sunday", "Sun."],
];

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

function getCurrentDayIndex(date: Date = new Date()): number {
  return (date.getDay() + 6) % 7; // Monday = 0
}

function getCurrentDayKey(date: Date = new Date()): string {
  const dayTuple = DAYS[getCurrentDayIndex(date)];
  return dayTuple ? dayTuple[0] : "monday";
}

function formatTime(time?: string): string {
  if (!time) return "--";
  const parts = time.split(":").map(Number);
  const hour = parts[0] ?? 0;
  const minute = parts[1] ?? 0;
  return timeFormatter.format(new Date(2000, 0, 1, hour, minute));
}

function parseMinutes(time?: string): number {
  if (!time) return 0;
  const parts = time.split(":").map(Number);
  const hour = parts[0] ?? 0;
  const minute = parts[1] ?? 0;
  return hour * 60 + minute;
}

function getNextOpening(
  availability?: AvailabilitySchedule | null,
  currentDayIndex: number = 0
): NextOpening | null {
  const safeAvailability = availability || {};

  for (let offset = 1; offset <= 7; offset++) {
    const index = (currentDayIndex + offset) % 7;
    const dayTuple = DAYS[index];
    if (!dayTuple) continue;

    const [key, label] = dayTuple;
    const slot = safeAvailability[key];

    if (slot?.enabled && slot.from && slot.to) {
      return {
        label: offset === 1 ? "Tomorrow" : label,
        time: formatTime(slot.from),
      };
    }
  }

  return null;
}

function getStatus(availability?: AvailabilitySchedule | null): StatusResult {
  const safeAvailability = availability || {};

  const now = new Date();
  const dayIndex = getCurrentDayIndex(now);
  const dayTuple = DAYS[dayIndex];
  const dayKey = dayTuple ? dayTuple[0] : "monday";

  const slot = safeAvailability[dayKey];

  if (!slot?.enabled || !slot.from || !slot.to) {
    const next = getNextOpening(safeAvailability, dayIndex);
    return {
      open: false,
      text: next
        ? `Closed • Opens ${next.label} ${next.time}`
        : "Closed",
    };
  }

  const current = now.getHours() * 60 + now.getMinutes();
  const start = parseMinutes(slot.from);
  const end = parseMinutes(slot.to);

  const isOpen =
    end >= start
      ? current >= start && current <= end
      : current >= start || current <= end;

  if (isOpen) {
    return {
      open: true,
      text: `Open • Closes ${formatTime(slot.to)}`,
    };
  }

  if (end >= start && current < start) {
    return {
      open: false,
      text: `Closed • Opens Today ${formatTime(slot.from)}`,
    };
  }

  const next = getNextOpening(safeAvailability, dayIndex);
  return {
    open: false,
    text: next
      ? `Closed • Opens ${next.label} ${next.time}`
      : "Closed",
  };
}

function createAvailabilityRow(
  key: string,
  label: string,
  slot?: TimeSlot,
  todayKey?: string
): HTMLElement {
  const isToday = key === todayKey;
  const row = createElement("div", {
    class: `availability-row ${isToday ? "availability-today" : ""}`,
  }) as HTMLElement;

  row.append(
    createElement("div", { class: "availability-day" }, [label])
  );

  const content = createElement("div", { class: "availability-content" }) as HTMLElement;

  if (!slot?.enabled || !slot.from || !slot.to) {
    content.append(
      createElement("span", { class: "availability-unavailable" }, ["Unavailable"])
    );
  } else {
    const times = createElement("div", { class: "availability-times" }) as HTMLElement;

    times.append(
      createElement(
        "time",
        {
          class: "availability-time-pill",
          datetime: slot.from,
        },
        [formatTime(slot.from)]
      ),
      createElement("span", { class: "availability-separator" }, ["–"]),
      createElement(
        "time",
        {
          class: "availability-time-pill",
          datetime: slot.to,
        },
        [formatTime(slot.to)]
      )
    );

    content.append(times);
  }

  row.append(content);
  return row;
}

export function renderAvailabilityWidget(
  availability?: AvailabilitySchedule | null
): HTMLElement {
  const safeAvailability = availability || {};
  const status = getStatus(safeAvailability);
  const todayKey = getCurrentDayKey();

  const container = createElement("section", {
    class: "availability-widget",
  }) as HTMLElement;

  container.append(
    createElement(
      "div",
      {
        class: `availability-status-pill ${
          status.open ? "is-open" : "is-closed"
        }`,
      },
      [status.text]
    ),
    createElement("h4", { class: "availability-title" }, ["Business Hours"])
  );

  for (const [key, label] of DAYS) {
    container.append(
      createAvailabilityRow(key, label, safeAvailability[key], todayKey)
    );
  }

  return container;
}