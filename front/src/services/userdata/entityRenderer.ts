import Datex from "../../components/base/Datex.js";
import { createElement } from "../../components/createElement.js";
import type { EntityType, EntityItem } from "./types.js";

// Label mapping dictionary
const ENTITY_LABELS: Record<string, string> = {
  media: "Media ID",
  ticket: "Ticket ID",
  merch: "Merch ID",
  review: "Review ID",
  comment: "Comment ID",
  like: "Like ID",
  favourite: "Favourite ID",
  booking: "Booking ID",
  blogpost: "Blogpost ID",
  collection: "Collection ID"
};

// Route mapping dictionary
const ENTITY_ROUTES: Record<string, (id: string | number) => string> = {
  place: (id) => `/place/${id}`,
  event: (id) => `/event/${id}`,
  feedpost: (id) => `/feedpost/${id}`,
  merch: (id) => `/merch/${id}`
};

/**
 * Handles copying text to clipboard safely
 */
async function copyToClipboard(text: string, targetElement: HTMLElement): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    const originalText = targetElement.textContent || "";
    targetElement.textContent = "Copied ID!";
    setTimeout(() => {
      targetElement.textContent = originalText;
    }, 1500);
  } catch (error) {
    console.error("Failed to copy text: ", error);
  }
}

/**
 * Creates an entity card item
 */
function createEntityCard(item: EntityItem, entityType: EntityType): HTMLDivElement {
  const label = ENTITY_LABELS[entityType] || "Post ID";
  const getRoute = ENTITY_ROUTES[entityType];
  const href = getRoute ? getRoute(item.entity_id) : "#";

  // Card text content
  const cardContent = createElement("p", { class: "entity-card-info" }, [
    `${label}: ${item.entity_id} - Created At: ${Datex(item.created_at, true)}`
  ]);

  cardContent.addEventListener("click", () =>
    copyToClipboard(String(item.entity_id), cardContent)
  );

  // Entity navigation link
  const entityLink = createElement("a", { class: "entity-card-link", href }, ["View Details"]);

  // Card container
  return createElement("div", { class: "card entity-card" }, [cardContent, entityLink]);
}

/**
 * Render fetched data inside the tab container.
 */
export function renderEntityData(
  container: HTMLElement,
  data: EntityItem[] | null | undefined,
  entityType: EntityType
): void {
  container.replaceChildren();

  if (!data || data.length === 0) {
    const emptyMsg = createElement("div", { class: "empty-state" }, [`No ${entityType} data found.`]);
    container.append(emptyMsg);
    return;
  }

  const listItems = data.map((item) =>
    createElement("li", { class: "entity-list-item" }, [createEntityCard(item, entityType)])
  );
  const list = createElement("ul", { class: "entity-list" }, listItems);

  container.append(list);
}