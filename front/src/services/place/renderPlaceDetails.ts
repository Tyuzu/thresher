import { createElement } from "../../components/createElement.js";
// Fixed: Direct import from editPlace.ts to avoid barrel export cycle
import { editPlaceForm, deletePlace } from "./editPlace.js"; 
import { analyticsPlace } from "./placeAnanlytics.js";
import Button, { ButtonOptions } from "../../components/base/Button.js";
import { reportEntity } from "../reporting/reporting.js";
import Datex from "../../components/base/Datex.js";
import Bannerx from "../../components/base/Bannerx.js";
import { EntityType } from "../../utils/imagePaths.js"; 

export interface PlaceCoordinates {
  lat?: number;
  lng?: number;
}

export interface Place {
  placeid: string;
  name?: string;
  banner?: string;
  description?: string;
  address?: string;
  category?: string;
  coordinates?: PlaceCoordinates;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
}

interface MetadataField {
  label: string;
  value?: string | Node | null;
}

/**
 * Renders the top-level hero banner for the place
 */
function createPlaceBanner(place: Place, isCreator: boolean): HTMLElement {
  return Bannerx({
    isCreator: isCreator,
    bannerkey: place.banner,
    banneraltkey: `Banner for ${place.name || "Place"}`,
    bannerentitytype: EntityType.PLACE,
    stateentitykey: "place",
    bannerentityid: place.placeid
  });
}

/**
 * Main render entry point for the place details view
 */
export function renderPlaceDetails(
  isLoggedIn: boolean, 
  content: HTMLElement, 
  place: Place, 
  isCreator: boolean
): void {
  content.replaceChildren();

  const createdDate = Datex(place.created_at);
  const updatedDate = Datex(place.updated_at);

  // 1. Build main details block
  const detailsSection = createElement("section", { id: "placedetails", class: "placedetails" }, [
    createElement("h1", {}, [place.name || "Place"]),
    ...createMetadataFields(place, createdDate, updatedDate)
  ]);

  // 2. Append interaction controls depending on ownership role
  if (isCreator) {
    const creatorControls = createCreatorControls(place, isLoggedIn);
    detailsSection.appendChild(creatorControls);
  } else {
    const reportBtn = Button({
      title: "Report",
      id: "button-dfsh4",
      classes: "report-comment buttonx",
      events: {
        click: () => reportEntity(place.placeid, "place", "", "")
      }
    });
    detailsSection.appendChild(reportBtn);
  }

  // 3. Assemble and render layout elements in correct order
  content.appendChild(createPlaceBanner(place, isCreator));
  content.appendChild(detailsSection);
}

/**
 * Helper to build descriptive text lines for metadata fields cleanly
 */
function createMetadataFields(
  place: Place, 
  createdDate: string | Node, 
  updatedDate: string | Node
): HTMLElement[] {
  const lat = place.coordinates?.lat;
  const lng = place.coordinates?.lng;
  const coordinatesString = (lat !== undefined && lng !== undefined) 
    ? `Lat: ${lat}, Lng: ${lng}` 
    : "N/A";

  const fields: MetadataField[] = [
    { label: "Description: ", value: place.description },
    { label: "Address: ", value: place.address },
    { label: "Coordinates: ", value: coordinatesString },
    { label: "Category: ", value: place.category },
    { label: "Created: ", value: createdDate },
    { label: "Last Updated: ", value: updatedDate }
  ];

  return fields.map(field => 
    createElement("p", {}, [
      createElement("strong", {}, [field.label]), 
      field.value || "N/A"
    ])
  );
}

/**
 * Helper to construct the layout containers and action buttons for owners
 */
function createCreatorControls(place: Place, isLoggedIn: boolean): HTMLElement {
  const actionsWrapper = createElement("div", { class: "hvflex" });
  const editContainer = createElement("div", { id: "editplace" });
  const analyticsContainer = createElement("div", { class: "place-analytics-wrapper" });

  const editBtn = Button({
    title: "Edit Place",
    id: "edit-place-btn",
    classes: "buttonx secondary",
    events: {
      click: () => {
        // Ensure container is cleared before rendering form to prevent duplicate appending
        editContainer.replaceChildren();
        editPlaceForm(isLoggedIn, place.placeid, editContainer);
      }
    }
  });

  const deleteBtn = Button({
    title: "Delete Place",
    id: "delete-place-btn",
    classes: "delete-btn buttonx",
    events: {
      click: () => deletePlace(isLoggedIn, place.placeid)
    }
  });

  const analyticsBtn = Button({
    title: "View Analytics",
    id: "analytics-place-btn",
    classes: "buttonx secondary",
    events: {
      click: () => {
        // Ensure container is cleared before rendering analytics to prevent duplicates
        analyticsContainer.replaceChildren();
        analyticsPlace(analyticsContainer, isLoggedIn, place.placeid);
      }
    }
  });

  actionsWrapper.append(editBtn, deleteBtn, analyticsBtn);

  // Group wrappers into a logical layout fragment
  const containerFragment = createElement("div", { class: "creator-controls-group" }, [
    actionsWrapper,
    editContainer,
    analyticsContainer
  ]);

  return containerFragment;
}