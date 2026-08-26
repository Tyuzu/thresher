// createOrEditItinerary.ts
import Button from "../../components/base/Button.js";
import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.js";
import { navigate } from "../../routes/navigate.js";
import { createItineraryRequest, updateItineraryRequest, fetchItineraryById, type ItineraryApiItem } from "./api.js";

let dayCount = 0;

/* ---------- types ---------- */

interface Visit {
  transport?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  [key: string]: unknown;
}

interface Day {
  date?: string;
  visits?: Visit[];
  [key: string]: unknown;
}

interface Itinerary {
  itineraryid?: string | number;
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  days?: Day[];
  [key: string]: unknown;
}

interface InputFieldConfig {
  name: string;
  type: string;
  placeholder?: string;
  required?: boolean;
  id: string;
  label?: string;
  value?: string | number;
  classes?: string;
}

/* ---------- helpers ---------- */

function clearNode(node: HTMLElement): void {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function showFormError(form: HTMLElement, message: string): void {
  let box = form.querySelector(".form-error") as HTMLElement | null;

  if (!box) {
    box = createElement("div", { class: "form-error" }, []) as HTMLElement;
    form.prepend(box);
  }

  box.textContent = message;
}

function clearFormError(form: HTMLElement): void {
  const box = form.querySelector(".form-error") as HTMLElement | null;
  if (box) {
    box.textContent = "";
  }
}

function createInputField({ name, type, placeholder, required, id, label, value, classes }: InputFieldConfig): HTMLElement {
  const group = createElement("div", { class: "form-group" }, []) as HTMLElement;

  if (label) {
    group.append(
      createElement("label", { for: id }, [label])
    );
  }

  const input =
    type === "textarea"
      ? (createElement("textarea", { name, id }, []) as HTMLTextAreaElement)
      : (createElement("input", { type, name, id }, []) as HTMLInputElement);

  if (placeholder) {
    input.setAttribute("placeholder", placeholder);
  }
  if (required) {
    input.required = true;
  }
  if (value !== undefined) {
    input.value = String(value);
  }
  if (classes) {
    input.setAttribute("class", classes);
  }

  group.append(input);
  return group;
}

function createTransportDropdown(selected?: string): HTMLElement {
  const group = createElement("div", { class: "form-group transport-group" }, [
    createElement("label", {}, ["Transport from previous stop"])
  ]) as HTMLElement;

  const select = createElement("select", { class: "transport-mode" }, []) as HTMLSelectElement;

  ["airplane", "car", "train", "walking", "other"].forEach(v => {
    const opt = createElement("option", { value: v }, [v]) as HTMLOptionElement;
    if (selected === v) {
      opt.selected = true;
    }
    select.append(opt);
  });

  group.append(select);
  return group;
}

/* ---------- visits ---------- */

function createVisitEntry(daySection: HTMLElement, visit: Visit = {}): void {
  const visitsContainer = daySection.querySelector(".visits-container") as HTMLElement;
  const idx = visitsContainer.children.length;
  const dayIndexAttr = daySection.dataset.dayIndex || "0";

  const entry = createElement("div", {
    class: "visit-entry",
    "data-visit-index": String(idx)
  }, []) as HTMLElement;

  if (idx > 0) {
    entry.append(createTransportDropdown(visit.transport));
  }

  entry.append(
    createInputField({
      name: "start_time",
      type: "time",
      id: `d${dayIndexAttr}-v${idx}-st`,
      label: "Start Time",
      required: true,
      value: visit.start_time,
      classes: "start-time"
    }),
    createInputField({
      name: "end_time",
      type: "time",
      id: `d${dayIndexAttr}-v${idx}-en`,
      label: "End Time",
      required: true,
      value: visit.end_time,
      classes: "end-time"
    }),
    createInputField({
      name: "location",
      type: "text",
      id: `d${dayIndexAttr}-v${idx}-loc`,
      label: "Location",
      required: true,
      value: visit.location,
      classes: "visit-location"
    })
  );

  const rmButton = Button({
    title: "Remove visit", id: "rm-visit", events: {
      click: () => visitsContainer.removeChild(entry)
    }, classes: "buttonx secondary"
  }) as HTMLButtonElement;

  entry.append(rmButton);
  visitsContainer.append(entry);
}

/* ---------- days ---------- */

function createDaySection(day: Day = {}): HTMLElement {
  const idx = dayCount++;
  const dayDiv = createElement("div", {
    class: "day-section",
    "data-day-index": String(idx)
  }, []) as HTMLElement;

  dayDiv.append(
    createElement("h3", {}, [`Day ${idx + 1}`]),
    createInputField({
      name: "dayDate",
      type: "date",
      id: `day-${idx}-date`,
      label: "Date",
      required: true,
      value: day.date,
      classes: "day-date"
    })
  );

  const visitsContainer = createElement("div", { class: "visits-container" }, []) as HTMLElement;
  dayDiv.append(visitsContainer);

  const addVisitBtn = Button({title:"Add visit", id:"add-visit", events:{
    click: () => createVisitEntry(dayDiv)
  }, classes:"buttonx"}) as HTMLButtonElement;

  const rmDayBtn = Button({title:"Remove Day", id:"rm-day", events:{
    click: () => dayDiv.remove()
  }, classes:"buttonx secondary"}) as HTMLButtonElement;

  dayDiv.append(addVisitBtn, rmDayBtn);

  if (Array.isArray(day.visits) && day.visits.length) {
    day.visits.forEach(v => createVisitEntry(dayDiv, v));
  } else {
    createVisitEntry(dayDiv);
  }

  return dayDiv;
}

/* ---------- status ---------- */

function createStatusDropdown(selected?: string): HTMLElement {
  const group = createElement("div", { class: "form-group" }, [
    createElement("label", { for: "status" }, ["Status"])
  ]) as HTMLElement;

  const select = createElement("select", { id: "status", name: "status" }, []) as HTMLSelectElement;

  ["draft", "confirmed"].forEach(v => {
    const opt = createElement("option", { value: v }, [v]) as HTMLOptionElement;
    if (selected === v) {
      opt.selected = true;
    }
    select.append(opt);
  });

  group.append(select);
  return group;
}

/* ---------- payload ---------- */

function buildPayload(form: HTMLFormElement, daysContainer: HTMLElement, itineraryId?: string | number) {
  const days: Day[] = [];

  daysContainer.querySelectorAll(".day-section").forEach(dayDiv => {
    const dateInput = dayDiv.querySelector(".day-date") as HTMLInputElement;
    const date = dateInput?.value;
    if (!date) {
      return;
    }

    const visits: Visit[] = [];
    dayDiv.querySelectorAll(".visit-entry").forEach(v => {
      const locInput = v.querySelector(".visit-location") as HTMLInputElement;
      const startInput = v.querySelector(".start-time") as HTMLInputElement;
      const endInput = v.querySelector(".end-time") as HTMLInputElement;

      const location = locInput?.value.trim() || "";
      const start = startInput?.value || "";
      const end = endInput?.value || "";

      if (!location || !start || !end) {
        return;
      }
      if (start >= end) {
        return;
      }

      const t = v.querySelector(".transport-mode") as HTMLSelectElement;
      const visit: Visit = { location, start_time: start, end_time: end };
      if (t) {
        visit.transport = t.value;
      }

      visits.push(visit);
    });

    if (visits.length) {
      days.push({ date, visits });
    }
  });

  const elements = form.elements as unknown as Record<string, HTMLInputElement | HTMLSelectElement>;

  return {
    ...(itineraryId ? { itineraryid: itineraryId } : {}),
    name: elements.name?.value.trim() || "",
    description: elements.description?.value.trim() || "",
    start_date: elements.start_date?.value || "",
    end_date: elements.end_date?.value || "",
    status: elements.status?.value || "draft",
    days
  };
}

/* ---------- render ---------- */

export async function renderItineraryForm(container: HTMLElement, isLoggedIn: boolean, mode: string = "create", itinerary?: Itinerary): Promise<void> {
  clearNode(container);

  if (!isLoggedIn) {
    container.append(createElement("p", {}, ["Please log in to manage itineraries."]));
    return;
  }

  dayCount = 0;

  const form = createElement("form", { class: "create-section" }, []) as HTMLFormElement;

  form.append(
    createElement("h2", {}, [mode === "edit" ? "Edit Itinerary" : "Create Itinerary"]),
    createInputField({ name: "name", id: "name", type: "text", label: "Name", required: true, value: itinerary?.name }),
    createInputField({ name: "description", id: "description", type: "textarea", label: "Description", required: true, value: itinerary?.description }),
    createInputField({ name: "start_date", id: "start_date", type: "date", label: "Start Date", required: true, value: itinerary?.start_date }),
    createInputField({ name: "end_date", id: "end_date", type: "date", label: "End Date", required: true, value: itinerary?.end_date })
  );

  const daysContainer = createElement("div", { id: "daysContainer" }, []) as HTMLElement;
  form.append(daysContainer);

  const addDayBtn = Button({titls:"Add Day", id:"add-day", events:{
    click: () => daysContainer.append(createDaySection())
  }, classes:"buttonx primary"}) as HTMLButtonElement;

  form.append(addDayBtn);

  if (Array.isArray(itinerary?.days) && itinerary.days.length) {
    itinerary.days.forEach(d => daysContainer.append(createDaySection(d)));
  } else {
    daysContainer.append(createDaySection());
  }

  const submitBtn = Button({title:(mode === "edit" ? "Update" : "Create"), id:"submit-it", events:{}, classes:"buttonx primary"}) as HTMLButtonElement;

  form.append(
    createStatusDropdown(itinerary?.status || "draft"),
    submitBtn
  );

  form.addEventListener("submit", async e => {
    e.preventDefault();
    clearFormError(form);

    try {
      const payload = buildPayload(form, daysContainer, itinerary?.itineraryid);

      if (!payload.days.length) {
        showFormError(form, "At least one valid day with visits is required.");
        return;
      }

      if (payload.start_date > payload.end_date) {
        showFormError(form, "Start date cannot be after end date.");
        return;
      }

      const url = mode === "edit"
        ? `/itineraries/${itinerary?.itineraryid}`
        : "/itineraries";

      const method = mode === "edit" ? "PUT" : "POST";

      const response = mode === "edit"
        ? await updateItineraryRequest(itinerary?.itineraryid ?? "", payload)
        : await createItineraryRequest(payload);

      if (!response) {
        throw new Error("Server returned an empty response.");
      }

      Notify("Successfully updated ", { type: "success" });

      navigate("/itinerary");

    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
      showFormError(form, errorMessage);
    }
  });

  container.append(form);
}

/* ---------- wrappers ---------- */

export function createItinerary(container: HTMLElement, isLoggedIn: boolean): void {
  renderItineraryForm(container, isLoggedIn, "create");
}

export async function editItinerary(container: HTMLElement, isLoggedIn: boolean, id: string | number): Promise<void> {
  clearNode(container);

  try {
    const response = await fetchItineraryById(id);
    const it = ((response as { data?: ItineraryApiItem })?.data ?? (response as ItineraryApiItem)) as Itinerary;

    if (!it) {
      throw new Error("Itinerary not found.");
    }

    renderItineraryForm(container, isLoggedIn, "edit", it);

  } catch (err: unknown) {
    console.error(err);

    container.append(
      createElement("p", { class: "error-text" }, [
        "Failed to load itinerary."
      ])
    );

    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("navigate", { detail: "/itinerary" })
      );
    }, 2000);
  }
}