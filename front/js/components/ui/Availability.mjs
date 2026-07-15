import "../../../css/ui/Availability.css";
import { createElement } from "../createElement.js";

const DAYS = [
  ["monday", "Mon."],
  ["tuesday", "Tue."],
  ["wednesday", "Wed."],
  ["thursday", "Thu."],
  ["friday", "Fri."],
  ["saturday", "Sat."],
  ["sunday", "Sun."]
];

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit"
});

function getCurrentDayIndex(date = new Date()) {
  return (date.getDay() + 6) % 7; // Monday = 0
}

function getCurrentDayKey(date = new Date()) {
  return DAYS[getCurrentDayIndex(date)][0];
}

const TODAY = getCurrentDayKey();

function formatTime(time) {
  if (!time) {
    return "--";
  }

  const [hour, minute] = time.split(":").map(Number);

  return timeFormatter.format(new Date(2000, 0, 1, hour, minute));
}

function parseMinutes(time) {
  const [hour, minute] = time.split(":").map(Number);

  return hour * 60 + minute;
}

function getNextOpening(availability, currentDayIndex) {
  for (let offset = 1; offset <= 7; offset++) {
    const index = (currentDayIndex + offset) % 7;
    const [key, label] = DAYS[index];
    const slot = availability[key];

    if (slot?.enabled && slot.from && slot.to) {
      return {
        label: offset === 1 ? "Tomorrow" : label,
        time: formatTime(slot.from)
      };
    }
  }

  return null;
}

function getStatus(availability = {}) {
  const now = new Date();

  const dayIndex = getCurrentDayIndex(now);
  const dayKey = DAYS[dayIndex][0];

  const slot = availability[dayKey];

  if (!slot?.enabled || !slot.from || !slot.to) {
    const next = getNextOpening(availability, dayIndex);

    return {
      open: false,
      text: next
        ? `Closed • Opens ${next.label} ${next.time}`
        : "Closed"
    };
  }

  const current = now.getHours() * 60 + now.getMinutes();
  const start = parseMinutes(slot.from);
  const end = parseMinutes(slot.to);

  const isOpen = end >= start
    ? current >= start && current <= end
    : current >= start || current <= end;

  if (isOpen) {
    return {
      open: true,
      text: `Open • Closes ${formatTime(slot.to)}`
    };
  }

  if (current < start) {
    return {
      open: false,
      text: `Closed • Opens Today ${formatTime(slot.from)}`
    };
  }

  const next = getNextOpening(availability, dayIndex);

  return {
    open: false,
    text: next
      ? `Closed • Opens ${next.label} ${next.time}`
      : "Closed"
  };
}

function createAvailabilityRow(key, label, slot) {
  const row = createElement("div", {
    class: `availability-row ${
      key === TODAY ? "availability-today" : ""
    }`
  });

  row.append(
    createElement("div", {
      class: "availability-day"
    }, [
      label
    ])
  );

  const content = createElement("div", {
    class: "availability-content"
  });

  if (!slot?.enabled || !slot.from || !slot.to) {
    content.append(
      createElement("span", {
        class: "availability-unavailable"
      }, [
        "Unavailable"
      ])
    );
  } else {
    const times = createElement("div", {
      class: "availability-times"
    });

    times.append(
      createElement("time", {
        class: "availability-time-pill",
        datetime: slot.from
      }, [
        formatTime(slot.from)
      ]),
      createElement("span", {
        class: "availability-separator"
      }, [
        "–"
      ]),
      createElement("time", {
        class: "availability-time-pill",
        datetime: slot.to
      }, [
        formatTime(slot.to)
      ])
    );

    content.append(times);
  }

  row.append(content);

  return row;
}

export function renderAvailabilityWidget(availability = {}) {
  const status = getStatus(availability);

  const container = createElement("section", {
    class: "availability-widget"
  });

  container.append(
    createElement("div", {
      class: `availability-status-pill ${
        status.open ? "is-open" : "is-closed"
      }`
    }, [
      status.text
    ])
  );

  container.append(
    createElement("h4", {
      class: "availability-title"
    }, [
      "Business Hours"
    ])
  );

  for (const [key, label] of DAYS) {
    container.append(
      createAvailabilityRow(key, label, availability[key])
    );
  }

  return container;
}