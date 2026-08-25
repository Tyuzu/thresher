import { renderAnalyticsPage } from "../analytics/analyticsService";
import Notify from "../../components/ui/Notify.js";

export interface AnalyticsOptions {
  container: HTMLElement;
  isLoggedIn: boolean;
  entityType: string;
  entityId: string;
}

/**
 * View Analytics for a specific place
 */
export async function analyticsPlace(
  anacon: HTMLElement, 
  isLoggedIn: boolean, 
  placeId: string
): Promise<void> {
  if (!isLoggedIn) {
    Notify("Please log in to view your event analytics.", { 
      type: "warning", 
      duration: 3000, 
      dismissible: true 
    });
    return;
  }

  const userConfirmed = confirm("Do you want to view event analytics?");
  if (!userConfirmed) return;

  // Render page for a specific place
  renderAnalyticsPage({ 
    container: anacon, 
    isLoggedIn: true, 
    entityType: "places", 
    entityId: placeId 
  });
}