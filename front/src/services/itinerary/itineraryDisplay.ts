// itineraryDisplay.ts
import Button from "../../components/base/Button.js";
import { createElement } from "../../components/createElement.js";
import Modal from "../../components/ui/Modal.js";
import { navigate } from "../../routes/navigate.js";
import { getState } from "../../state/state.js";
import { editItinerary } from "./itineraryEdit.js";
import {
  fetchItineraries,
  searchItinerariesApi,
  fetchItineraryById,
  deleteItineraryRequest,
  forkItineraryRequest,
  publishItineraryRequest,
  type ItineraryApiItem
} from "./api.js";

interface Visit {
  start_time?: string;
  end_time?: string;
  location?: string;
  transport?: string;
  [key: string]: unknown;
}

interface Day {
  date?: string;
  visits?: Visit[];
  [key: string]: unknown;
}

interface Itinerary {
  itineraryid?: string | number;
  userid?: string | number;
  name?: string;
  status?: string;
  published?: boolean;
  start_date?: string;
  end_date?: string;
  description?: string;
  days?: Day[];
  [key: string]: unknown;
}

interface UserState {
  userid?: string | number;
  [key: string]: unknown;
}

function clear(node: HTMLElement): void {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function displayItinerary(isLoggedIn: boolean, root: HTMLElement): void {
  clear(root);

  if (!isLoggedIn) {
    root.append(
      createElement("p", {}, ["Please log in to view and manage your itineraries."])
    );
    return;
  }

  const rightPane = createElement("div", { class: "itinerary-right" }, [
    createElement("p", {}, ["Select an itinerary to see details here."])
  ]) as HTMLElement;

  const listDiv = createElement("div", {}, []) as HTMLElement;

  root.append(
    createElement("div", { class: "itinerary-layout" }, [
      createElement("div", { class: "itinerary-left" }, [
        createSearchForm(listDiv),
        Button({
          title: "Create Itinerary",
          id: "create-itinerary",
          events: { click: () => navigate("/create-itinerary") },
          classes: "itinerary-create-btn"
        }),
        listDiv
      ]),
      rightPane
    ])
  );

  loadItineraries();

  /* ---------- API ---------- */

  async function loadItineraries(): Promise<void> {
    setListMessage("Loading…");
    try {
      const resp = await fetchItineraries();
      const items = Array.isArray(resp) ? (resp as ItineraryApiItem[]) : ((resp as { data?: ItineraryApiItem[] })?.data || []);
      renderList(items as Itinerary[]);
    } catch (_err) {
      setListMessage("Error loading itineraries.");
    }
  }

  async function searchItinerariesList(qs: string): Promise<void> {
    setListMessage("Searching…");
    try {
      const resp = await searchItinerariesApi(qs);
      const items = Array.isArray(resp) ? (resp as ItineraryApiItem[]) : ((resp as { data?: ItineraryApiItem[] })?.data || []);
      renderList(items as Itinerary[]);
    } catch (_err) {
      setListMessage("Error searching itineraries.");
    }
  }

  function setListMessage(msg: string): void {
    clear(listDiv);
    listDiv.append(createElement("p", {}, [msg]));
  }

  /* ---------- Rendering ---------- */

  function renderList(items: Itinerary[] = []): void {
    clear(listDiv);

    if (!items.length) {
      listDiv.append(createElement("p", {}, ["No itineraries found."]));
      return;
    }

    const ul = createElement("ul", { class: "itinerary-list" }, []) as HTMLElement;
    items.forEach(it => ul.append(createListItem(it)));
    listDiv.append(ul);
  }

  function createListItem(it: Itinerary = {}): HTMLElement {
    const currentUser = getState("user") as UserState | null;
    const isCreator = currentUser?.userid === it.userid;
    const itineraryId = it.itineraryid ?? "";

    const li = createElement("li", { class: "itinerary-list-item" }, [
      createElement("strong", {}, [it.name || "Untitled"]),
      createElement("span", {}, [` (${it.status || "Unknown"}) `])
    ]) as HTMLElement;

    li.append(
      Button({
        title: "View", id: `view-${itineraryId}`, events: {
          click: () => openViewModal(itineraryId)
        }, classes: "itinerary-btn secondary"
      }),

      Button({
        title: "Fork", id: `fork-${itineraryId}`, events: {
          click: () => forkItinerary(itineraryId)
        }, classes: "itinerary-btn secondary"
      })
    );

    if (isCreator) {
      li.append(
        Button({
          title: "Edit", id: `edit-${itineraryId}`, events: {
            click: () => editItinerary(rightPane, true, itineraryId)
          }, classes: "itinerary-btn"
        }),

        Button({
          title: "Delete", id: `del-${itineraryId}`, events: {
            click: () => deleteItinerary(itineraryId)
          }, classes: "itinerary-btn danger"
        })
      );

      if (!it.published) {
        li.append(
          Button({
            title: "Publish", id: `pub-${itineraryId}`, events: {
              click: () => publishItinerary(itineraryId)
            }, classes: "itinerary-btn success"
          })
        );
      }
    }

    return li;
  }

  /* ---------- View ---------- */

  async function openViewModal(id: string | number): Promise<void> {
    const modalResult = Modal({
      title: "Loading…",
      content: createElement("p", {}, ["Loading itinerary…"]),
      size: "large"
    });

    const dialog = modalResult.dialog || (modalResult as unknown as { container?: HTMLElement }).container;
    const body = dialog?.querySelector(".modal-body") as HTMLElement | null;

    if (!body) {
      return;
    }

    try {
      const resp = await fetchItineraryById(id);
      const it = ((resp as { data?: ItineraryApiItem })?.data ?? (resp as ItineraryApiItem)) as Itinerary;
      clear(body);
      body.append(renderDetails(it));
    } catch {
      clear(body);
      body.append(createElement("p", {}, ["Failed to load itinerary."]));
    }
  }

  function renderDetails(it: Itinerary = {}): HTMLElement {
    const days = it.days || [];
    const statusClass = it.status ? String(it.status) : "N/A";

    const wrap = createElement("div", { class: "itinerary-container enhanced" }, [
      createElement("h2", { class: "itinerary-title" }, [it.name || "Untitled"]),
      createElement("div", { class: "itinerary-meta" }, [
        createElement("span", { class: `status ${statusClass}` }, [
          `Status: ${it.status || "N/A"}`
        ]),
        createElement("span", {}, [
          `Dates: ${it.start_date || "?"} → ${it.end_date || "?"}`
        ])
      ]),
      createElement("p", { class: "itinerary-description" }, [
        it.description || "No description provided."
      ])
    ]) as HTMLElement;

    if (!days.length) {
      wrap.append(createElement("p", {}, ["No schedule available."]));
      return wrap;
    }

    days.forEach((day, i) => {
      const visits = Array.isArray(day.visits) ? [...day.visits] : [];

      const dayBlock = createElement("div", { class: "day-block" }, [
        createElement("h3", { class: "day-heading" }, [
          `Day ${i + 1} — ${day.date || "Unknown"}`
        ])
      ]) as HTMLElement;

      if (!visits.length) {
        dayBlock.append(createElement("p", {}, ["No visits."]));
        wrap.append(dayBlock);
        return;
      }

      // Sort visits by start time
      visits.sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));

      const timeline = createElement("div", { class: "timeline" }, []) as HTMLElement;

      visits.forEach((v, idx) => {
        const validTime = Boolean(
          v.start_time &&
          v.end_time &&
          v.start_time < v.end_time
        );

        const visitCard = createElement(
          "div",
          {
            class: `timeline-item ${validTime ? "" : "invalid"}`
          },
          [
            createElement("div", { class: "timeline-time" }, [
              validTime
                ? `${v.start_time} – ${v.end_time}`
                : "Invalid time range"
            ]),
            createElement("div", { class: "timeline-content" }, [
              createElement("strong", {}, [
                v.location || "Unknown location"
              ])
            ])
          ]
        );

        timeline.append(visitCard);

        // Transport between visits
        const nextVisit = visits[idx + 1];
        if (nextVisit && nextVisit.transport) {
          timeline.append(
            createElement(
              "div",
              { class: "timeline-transport" },
              [`Transport: ${nextVisit.transport}`]
            )
          );
        }
      });

      dayBlock.append(timeline);
      wrap.append(dayBlock);
    });

    return wrap;
  }

  /* ---------- Mutations ---------- */

  async function deleteItinerary(id: string | number): Promise<void> {
    if (!confirm("Delete this itinerary?")) {
      return;
    }
    await deleteItineraryRequest(id);
    loadItineraries();
  }

  async function forkItinerary(id: string | number): Promise<void> {
    await forkItineraryRequest(id);
    loadItineraries();
  }

  async function publishItinerary(id: string | number): Promise<void> {
    await publishItineraryRequest(id);
    loadItineraries();
  }

  /* ---------- Search ---------- */

  function createSearchForm(_listDiv: HTMLElement): HTMLFormElement {
    const form = createElement("form", { class: "itinerary-search-form" }, [
      createElement("input", { name: "start_date", placeholder: "Start Date (YYYY-MM-DD)" }),
      createElement("input", { name: "location", placeholder: "Location" }),
      createElement("input", { name: "status", placeholder: "Status (Draft/Confirmed)" }),
      createElement("button", { type: "submit" }, ["Search"])
    ]) as HTMLFormElement;

    form.addEventListener("submit", e => {
      e.preventDefault();
      const qs = new URLSearchParams(new FormData(form) as unknown as Record<string, string>).toString();
      searchItinerariesList(qs);
    });

    return form;
  }
}

export { displayItinerary };