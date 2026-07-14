import "../../../../css/ui/Availability.css";
import { createElement } from "../../../components/createElement.js";

const DAYS = [
  ["monday", "Mon"],
  ["tuesday", "Tue"],
  ["wednesday", "Wed"],
  ["thursday", "Thu"],
  ["friday", "Fri"],
  ["saturday", "Sat"],
  ["sunday", "Sun"]
];

const TODAY = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
][new Date().getDay()];

const PIXELS_PER_HOUR = 18;

function formatTime(time) {
  if (!time) {
    return "--";
  }

  const [h, m] = time.split(":").map(Number);

  const date = new Date();
  date.setHours(h, m);

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function isOpenNow(availability = {}) {
  const now = new Date();

  const today = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
  ][now.getDay()];

  const slot = availability[today];

  if (!slot?.enabled) {
    return false;
  }

  const [fh, fm] = slot.from.split(":").map(Number);
  const [th, tm] = slot.to.split(":").map(Number);

  const current = now.getHours() * 60 + now.getMinutes();
  const start = fh * 60 + fm;
  const end = th * 60 + tm;

  return current >= start && current <= end;
}

export function renderAvailabilityWidget(availability = {}) {
  const container = createElement("section", {
    class: "availability-widget"
  });

  container.append(
    createElement("div", {
      class: `availability-status ${
        isOpenNow(availability)
          ? "availability-open"
          : "availability-closed-status"
      }`
    }, [
      isOpenNow(availability)
        ? "🟢 Open Now"
        : "🔴 Closed Now"
    ])
  );

  container.append(
    createElement("h3", {}, ["🕒 Weekly Hours"])
  );

  // Timeline labels
  const timeline = createElement("div", {
    class: "availability-scale"
  });

  [0, 6, 12, 18, 24].forEach(hour => {
    timeline.append(
      createElement("span", {}, [
        `${String(hour).padStart(2, "0")}:00`
      ])
    );
  });

  container.append(timeline);

  DAYS.forEach(([key, label]) => {
    const slot = availability[key];

    const row = createElement("div", {
      class: `availability-row ${
        key === TODAY ? "availability-today" : ""
      }`
    });

    row.append(
      createElement("div", {
        class: "availability-day"
      }, [label])
    );

    if (!slot?.enabled) {
      row.append(
        createElement("div", {
          class: "availability-closed"
        }, ["Closed"])
      );

      container.append(row);
      return;
    }

    const [fh, fm] = slot.from.split(":").map(Number);
    const [th, tm] = slot.to.split(":").map(Number);

    const fromHour = fh + fm / 60;
    const toHour = th + tm / 60;

    const bar = createElement("div", {
      class: "availability-bar"
    });

    const fill = createElement("div", {
      class: "availability-fill"
    });

    fill.style.left = `${fromHour * PIXELS_PER_HOUR}px`;
    fill.style.width = `${(toHour - fromHour) * PIXELS_PER_HOUR}px`;

    bar.append(fill);

    row.append(
      createElement(
        "span",
        { class: "availability-time" },
        [formatTime(slot.from)]
      ),
      bar,
      createElement(
        "span",
        { class: "availability-time" },
        [formatTime(slot.to)]
      )
    );

    container.append(row);
  });

  return container;
}