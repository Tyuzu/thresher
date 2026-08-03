import { displayTickets } from "../tickets/displayTickets.js";
import { createElement } from "../../components/createElement.js";
import { apiFetch } from "../../api/api.js";
import { getState } from "../../state/state.js";
import Notify from "../../components/ui/Notify.mjs";
import Datex from "../../components/base/Datex.js";
import { createMainLayout } from "../../components/layout/mainLayout.js";
import { createAsideContent } from "../../components/layout/asideLayout.js";

/* ────────── Fetch Event ────────── */
async function fetchEventData(eventId) {
  const eventData = await apiFetch(
    `/events/event/${eventId}`,
    "GET"
  );

  // Check if there was an API error
  if (eventData?.success === false) {
    throw new Error(`Failed to load event: ${eventData.error}`);
  }
  
  // Check if response is invalid
  if (!eventData) {
    throw new Error("No event data received from server.");
  }
  
  // Check if tickets array exists and is an array
  if (!Array.isArray(eventData.tickets)) {
    console.warn("Event data structure:", eventData);
    throw new Error("Invalid event data received - missing tickets array.");
  }

  return eventData;
}

/* ────────── Render Tickets Page ────────── */
async function renderTicksPage(isLoggedIn, eventId, containerx) {
  containerx.replaceChildren();

  try {
    const eventData = await fetchEventData(eventId);

    const currentUserId = getState("user");
    const isCreator =
      isLoggedIn &&
      currentUserId &&
      currentUserId === eventData.creatorid;

    /* Header & Main Content Elements */
    const header = createElement("header", { class: "event-header" }, [
      createElement("h1", {}, [eventData.title]),
      createElement(
        "p",
        { class: "event-description" },
        [eventData.description || "No description available."]
      ),
      createElement("section", { class: "event-meta" }, [
        createElement("p", {}, [`Date: ${Datex(eventData.date, true)}`]),
        createElement(
          "p",
          {},
          [`Location: ${eventData.placename || eventData.location || "TBA"}`]
        ),
        createElement(
          "p",
          {},
          [`Category: ${eventData.category || "Uncategorized"}`]
        ),
        createElement(
          "p",
          {},
          [`Currency: ${eventData.currency || "N/A"}`]
        )
      ])
    ]);

    const editTabs = createElement("nav", { id: "edittabs", class: "edit-tabs" });
    const ticketSection = createElement("section", {
      class: "ticket-section",
      "aria-label": "Ticket List"
    });

    const mainContent = [header, editTabs, ticketSection];

    /* Organizer / Sidebar Content */
    const sidebarChildren = [];
    if (eventData.organizer_name || eventData.organizer_contact) {
      sidebarChildren.push(
        createElement("div", { class: "event-organizer-info" }, [
          createElement("p", {}, [`Name: ${eventData.organizer_name || "Unknown"}`]),
          createElement("p", {}, [`Contact: ${eventData.organizer_contact || "Not Provided"}`])
        ])
      );
    }

    const asideContent = createAsideContent({
      title: "Organizer",
      children: sidebarChildren,
      showAd: true
    });

    /* Render Layout */
    const layout = createMainLayout({
      mainContent,
      asideContent,
      pageClass: "tickscon"
    });

    containerx.append(layout);

    /* Load Tickets Into Section */
    await displayTickets(
      ticketSection,
      eventData.tickets,
      eventId,
      isCreator,
      isLoggedIn
    );

  } catch (err) {
    containerx.replaceChildren(
      createElement("h1", {}, ["Failed to load event details."])
    );

    Notify(
      "Failed to load event details. Please try again later.",
      { type: "error", duration: 3000 }
    );

    console.error(err);
  }
}

export { renderTicksPage };