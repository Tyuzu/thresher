import { createElement } from "../../components/createElement.js";
import { editPlaceForm, deletePlace } from "./placeService.js";
import { analyticsPlace } from "./placeAnanlytics.js";
import Button from "../../components/base/Button.js";
import { reportEntity } from "../reporting/reporting.js";
import Datex from "../../components/base/Datex.js";
import Bannerx from "../../components/base/Bannerx.js";
// Added missing EntityType import (verify relative path matches your directory structure)
import { EntityType } from "../../utils/imagePaths.js"; 

/**
 * Renders the top-level hero banner for the place
 */
function createPlaceBanner(place, isCreator) {
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
export function renderPlaceDetails(isLoggedIn, content, place, isCreator) {
  content.replaceChildren();

  const createdDate = Datex(place.created_at);
  const updatedDate = Datex(place.updated_at);

  // 1. Build main details block
  const detailsSection = createElement("section", { id: "placedetails", class: "placedetails" }, [
    createElement("h1", {}, [place.name]),
    ...createMetadataFields(place, createdDate, updatedDate)
  ]);

  // 2. Append interaction controls depending on ownership role
  if (isCreator) {
    const creatorControls = createCreatorControls(place, isLoggedIn);
    detailsSection.appendChild(creatorControls);
  } else {
    const reportBtn = Button("Report", "button-dfsh4", { 
      click: () => reportEntity(place.placeid, "place", "", "")
    }, "report-comment buttonx");
    detailsSection.appendChild(reportBtn);
  }

  // 3. Assemble and render layout elements in correct order
  content.appendChild(createPlaceBanner(place, isCreator));
  content.appendChild(detailsSection);
}

/**
 * Helper to build descriptive text lines for metadata fields cleanly
 */
function createMetadataFields(place, createdDate, updatedDate) {
  const lat = place.coordinates?.lat;
  const lng = place.coordinates?.lng;
  const coordinatesString = (lat !== undefined && lng !== undefined) 
    ? `Lat: ${lat}, Lng: ${lng}` 
    : "N/A";

  const fields = [
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
function createCreatorControls(place, isLoggedIn) {
  const actionsWrapper = createElement("div", { class: "hvflex" });
  const editContainer = createElement("div", { id: "editplace" });
  const analyticsContainer = createElement("div", { class: "place-analytics-wrapper" });

  const editBtn = Button("Edit Place", "edit-place-btn", {
    click: () => {
      // Ensure container is cleared before rendering form to prevent duplicate appending
      editContainer.replaceChildren();
      editPlaceForm(isLoggedIn, place.placeid, editContainer);
    },
  }, "buttonx secondary");

  const deleteBtn = Button("Delete Place", "delete-place-btn", {
    click: () => deletePlace(isLoggedIn, place.placeid),
  }, "delete-btn buttonx");

  const analyticsBtn = Button("View Analytics", "analytics-place-btn", {
    click: () => {
      // Ensure container is cleared before rendering analytics to prevent duplicates
      analyticsContainer.replaceChildren();
      analyticsPlace(analyticsContainer, isLoggedIn, place.placeid);
    },
  }, "buttonx secondary");

  actionsWrapper.append(editBtn, deleteBtn, analyticsBtn);

  // Group wrappers into a logical layout fragment
  const containerFragment = createElement("div", { class: "creator-controls-group" }, [
    actionsWrapper,
    editContainer,
    analyticsContainer
  ]);

  return containerFragment;
}