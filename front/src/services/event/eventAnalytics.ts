import Notify from "../../components/ui/Notify.js";
import { renderAnalyticsPage } from "../analytics/analyticsService";

// --- VIEW ANALYTICS ENTRYPOINT ---
export async function viewEventAnalytics(
    anacon: HTMLElement, 
    isLoggedIn: boolean, 
    eventId: string | number
): Promise<void> {
    if (!isLoggedIn) {
        Notify("Please log in to view your event analytics.", { type: "warning", duration: 3000, dismissible: true });
        return;
    }

    renderAnalyticsPage({
        container: anacon,
        isLoggedIn: true,
        entityType: "events",
        entityId: eventId
    });
}