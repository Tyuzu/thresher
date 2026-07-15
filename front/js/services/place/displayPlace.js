import { getState } from "../../state/state.js";
import { apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import { renderPlaceDetails } from "./renderPlaceDetails.js";
import { displayMedia } from "../media/ui/mediaGallery.js";
import { displayReviews } from "../reviews/displayReviews.js";
import { persistTabs } from "../../utils/persistTabs.js";
import { displayPlaceInfo } from "./placeTabs.js";
import {
  displayPlaceNearby,
  displayPlaceMenu,
  displayPlaceRooms,
  displayPlaceFacilities,
  displayPlaceServices,
  displayPlaceProducts,
  displayPlaceExhibits,
  displayPlaceMembership,
  displayPlaceShows,
  displaySaloonSlots,
  displayPlaceEvents,
  displayPlaceDetailsFallback,
} from "./customTabs.js";
import { displayPlaceJobs } from "../jobs/jobs.js";
import Notify from "../../components/ui/Notify.mjs";
import { displayBooking } from "../booking/booking.js";
import Button from "../../components/base/Button.js";
import { displayPlacesMap } from "./placeRemap.js";

/**
 * Main entry point to fetch and render a place page
 */
export default async function displayPlace(isLoggedIn, placeId, contentContainer) {
  if (!placeId || !contentContainer || !(contentContainer instanceof HTMLElement)) {
    console.error("Invalid arguments passed to displayPlace.");
    return;
  }

  try {
    const placeData = await apiFetch(`/places/place/${placeId}`);
    if (!placeData || typeof placeData !== "object") {
      throw new Error("Invalid place data received.");
    }

    const isCreator = isLoggedIn && getState("user") === placeData.createdBy;
    contentContainer.replaceChildren();

    // 1. Render Header
    const headerSection = createPlaceHeader(placeId, placeData, isCreator);
    contentContainer.appendChild(headerSection);

    // 2. Render Details & Map area
    const editSection = createElement("div", { class: "detail-section vflex" });
    renderPlaceDetailsSection(editSection, placeData, isCreator, isLoggedIn, contentContainer);

    // 3. Render Booking Interaction
    renderBookingSection(editSection, placeId, placeData, isCreator);

    // 4. Assemble Tabs & Initialize
    const tabs = buildPlaceTabs(placeId, placeData, isCreator, isLoggedIn);
    persistTabs(contentContainer, tabs, `place-tabs:${placeId}`);

  } catch (err) {
    console.error("displayPlace error:", err);
    contentContainer.replaceChildren();
    contentContainer.appendChild(createElement("h1", {}, [`Error loading place: ${err.message}`]));
    Notify("Failed to load place details. Please try again later.", { type: "error", duration: 3000, dismissible: true });
  }
}

/**
 * Creates the place title, owner tags, maps links, bookmarks and sharing options
 */
function createPlaceHeader(placeId, placeData, isCreator) {
  const headerSection = createElement("div", { class: "place-header" });
  const titleRow = createElement("div", { class: "place-header-row" });
  const heading = createElement("h1", {}, [placeData.name || "Unnamed"]);
  titleRow.appendChild(heading);

  if (isCreator) {
    titleRow.appendChild(createElement("span", { class: "owner-badge" }, ["Verified Owner"]));
  }

  const actions = createElement("div", { class: "place-header-actions" });
  const bookmarked = getBookmarks().includes(placeId);

  const bookmarkBtn = createElement("button", {
    title: "Bookmark this place",
    class: "action-icon-btn",
    onclick: () => {
      toggleBookmark(placeId);
      bookmarkBtn.textContent = getBookmarks().includes(placeId) ? "★" : "☆";
    }
  }, [bookmarked ? "★" : "☆"]);

  const shareBtn = createElement("button", {
    title: "Share",
    class: "action-icon-btn",
    onclick: () => {
      navigator.clipboard.writeText(location.href);
      Notify("Link copied to clipboard", { type: "success", duration: 3000, dismissible: true });
    }
  }, ["🔗"]);

  const { lat, lng } = placeData.coordinates || {};
  if (lat && lng) {
    const mapBtn = createElement("a", {
      href: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      target: "_blank",
      rel: "noopener noreferrer",
      title: "Open in Maps",
      class: "map-link-btn"
    }, ["🗺️"]);
    actions.appendChild(mapBtn);
  }

  actions.appendChild(bookmarkBtn);
  actions.appendChild(shareBtn);
  titleRow.appendChild(actions);
  headerSection.appendChild(titleRow);

  return headerSection;
}

/**
 * Handles the inline editable metadata display and the maps toggler
 */
function renderPlaceDetailsSection(editSection, placeData, isCreator, isLoggedIn, contentContainer) {
  try {
    renderPlaceDetails(isLoggedIn, editSection, placeData, isCreator);
    contentContainer.appendChild(editSection);

    const maparea = createElement("div", { class: "place-map-container" });
    const mapButton = Button("Show Map", "showMapBtn", {
      click: () => {
        const mapElement = displayPlacesMap();
        maparea.appendChild(mapElement);
        mapButton.remove();
      }
    }, "buttonx secondary");

    contentContainer.appendChild(mapButton);
    contentContainer.appendChild(maparea);
  } catch (err) {
    console.warn("Failed to render edit section:", err);
  }
}

/**
 * Builds and initializes the reservation booking manager area
 */
function renderBookingSection(editSection, placeId, placeData, isCreator) {
  const bookingContainer = createElement("div", { id: "place-booking" });
  editSection.appendChild(bookingContainer);

  const bookButton = Button("View Bookings", "booking-btn", {
    click: () => {
      displayBooking(
        {
          entityType: "place",
          entityId: placeId,
          entityCategory: placeData.category,
          userId: getState("user") || "guest",
          isAdmin: isCreator
        },
        bookingContainer
      );
    }
  }, "buttonx primary", { "margin-top": "16px", "padding": "8px 16px", "cursor": "pointer" });
  
  bookingContainer.appendChild(bookButton);
}

/**
 * Builds and returns the structured tabs array with safety boundaries
 */
function buildPlaceTabs(placeId, placeData, isCreator, isLoggedIn) {
  const tabs = [];

  // Info Tab
  tabs.push({
    title: "Info",
    id: "info-tab",
    render: (container) => {
      try {
        displayPlaceInfo(container, placeData, isCreator);
      } catch (err) {
        container.textContent = "Failed to load info.";
        console.warn(err);
      }
    },
  });

  // Dynamic Category-specific Tabs
  const category = (placeData.category || "").trim().toLowerCase();
  const categoryTabs = {
    restaurant: () => displayPlaceMenu,
    café: () => displayPlaceMenu,
    cafe: () => displayPlaceMenu,
    hotel: () => displayPlaceRooms,
    park: () => displayPlaceFacilities,
    business: () => displayPlaceServices,
    shop: () => displayPlaceProducts,
    museum: () => displayPlaceExhibits,
    gym: () => displayPlaceMembership,
    theater: () => displayPlaceShows,
    saloon: () => displaySaloonSlots,
    arena: () => displayPlaceEvents,
  };

  if (categoryTabs[category]) {
    const tabName = category.charAt(0).toUpperCase() + category.slice(1);
    tabs.push({
      title: (category === "cafe" || category === "café") ? "Menu" : tabName,
      id: `${category}-tab`,
      render: (container) => {
        try {
          categoryTabs[category]()(container, placeId, isCreator, isLoggedIn);
        } catch (err) {
          container.textContent = `${tabName} details are currently unavailable.`;
          console.warn(err);
        }
      }
    });
  } else {
    tabs.push({
      title: "Details",
      id: "details-tab",
      render: (container) => displayPlaceDetailsFallback(container, placeData.category || "", placeId)
    });
  }

  // Standard static tabs
  tabs.push(
    {
      title: "Nearby",
      id: "nearby-tab",
      render: (container) => {
        try {
          displayPlaceNearby(container, placeId);
        } catch {
          container.textContent = "Nearby places unavailable.";
        }
      },
    },
    {
      title: "Gallery",
      id: "gallery-tab",
      render: (container) => {
        try {
          displayMedia(container, "place", placeId, isLoggedIn);
        } catch {
          container.textContent = "Gallery could not load.";
        }
      },
    },
    {
      title: "Reviews",
      id: "reviews-tab",
      render: (container) => {
        try {
          displayReviews(container, isCreator, isLoggedIn, "place", placeId);
        } catch {
          container.textContent = "Reviews unavailable.";
        }
      },
    },
    {
      title: "Jobs",
      id: "jobs-tab",
      render: (container) => {
        try {
          displayPlaceJobs(container, isCreator, isLoggedIn, "place", placeId);
        } catch {
          container.textContent = "No jobs available.";
        }
      },
    }
  );

  return tabs;
}

// ─── Bookmark Utility Functions ─────────────────────────────────────────
function getBookmarks() {
  try {
    return JSON.parse(localStorage.getItem("bookmarked_places") || "[]");
  } catch {
    return [];
  }
}

function toggleBookmark(placeId) {
  let bookmarks = getBookmarks();
  if (bookmarks.includes(placeId)) {
    bookmarks = bookmarks.filter(id => id !== placeId);
  } else {
    bookmarks.push(placeId);
  }
  localStorage.setItem("bookmarked_places", JSON.stringify(bookmarks));
}