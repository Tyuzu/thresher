import { createElement } from "../../components/createElement.js";
import { getAnalytics } from "./api.js";
import Notify from "../../components/ui/Notify.js";
import Datex from "../../components/base/Datex.js";

/* ────────────────────── Interfaces & Types ────────────────────── */

export interface EngagementMetrics {
  [key: string]: string | number;
}

export interface InsightsData {
  [key: string]: string | number;
}

export interface AnalyticsMetrics {
  [key: string]: number | string;
}

export interface AnalyticsData {
  name?: string;
  type?: string;
  lastUpdated?: string | number | Date;
  metrics?: AnalyticsMetrics;
  trend?: (number | string)[];
  engagement?: EngagementMetrics;
  insights?: InsightsData;
  topLocations?: (string | number)[];
}

export interface RenderAnalyticsPageParams {
  container: HTMLElement | null;
  isLoggedIn: boolean;
  entityType?: string;
  entityId?: string | number | null;
}

/* ────────────────────── Utility Helpers ────────────────────── */

/**
 * Format system keys (e.g. "page_views" or "bounceRate") into human-friendly titles ("Page Views", "Bounce Rate")
 */
function beautifyKey(key: string): string {
  if (!key) return "";
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/* ────────────────────── Render Sub-components ────────────────────── */

function renderAnalytics(data: AnalyticsData): HTMLElement {
  const metrics = data.metrics && typeof data.metrics === "object" ? data.metrics : {};
  const trend = Array.isArray(data.trend) ? data.trend : [];
  const engagement = data.engagement && typeof data.engagement === "object" ? data.engagement : {};
  const insights = data.insights && typeof data.insights === "object" ? data.insights : {};
  const topLocations = Array.isArray(data.topLocations) ? data.topLocations : [];

  const lastUpdated = data.lastUpdated ? Datex(data.lastUpdated) : "";

  // 1. Header Section
  const headerChildren: (HTMLElement | null)[] = [
    createElement("h2", {}, [`Analytics for ${data.name || "Unknown"}`]),
    createElement("p", {}, [`Entity Type: ${data.type || "N/A"}`]),
    lastUpdated ? createElement("small", {}, ["Last Updated: ", String(lastUpdated)]) : null
  ];

  const header = createElement(
    "div",
    { class: "analytics-header" },
    headerChildren.filter((child): child is HTMLElement => child !== null)
  );

  // 2. Metrics Summary (Beautified labels)
  const summaryCards = createElement(
    "div",
    { class: "analytics-summary-cards" },
    Object.keys(metrics).map((key) =>
      createElement("div", { class: "analytics-card" }, [
        createElement("h4", {}, [beautifyKey(key)]),
        createElement("p", {}, [String(metrics[key] ?? 0)])
      ])
    )
  );

  // 3. Trend Section (Auto-scaled using percentage heights)
  const numericTrend = trend.map((v) => Math.max(0, Number(v) || 0));
  const maxTrendVal = Math.max(...numericTrend, 1); // fallback to 1 to prevent division by 0

  const trendSection = createElement("div", { class: "analytics-trend" }, [
    createElement("h3", {}, ["7-Day Trend"]),
    createElement(
      "div",
      {
        class: "trend-bars",
        style: {
          display: "flex",
          alignItems: "flex-end",
          height: "120px",
          gap: "8px",
          borderBottom: "1px solid #ddd",
          paddingBottom: "4px"
        }
      },
      numericTrend.map((val) => {
        const heightPct = (val / maxTrendVal) * 100;
        return createElement("div", {
          class: "trend-bar",
          style: {
            height: `${heightPct}%`,
            flex: "1",
            minHeight: "2px"
          },
          title: `Value: ${val}`
        });
      })
    )
  ]);

  // 4. Engagement Details
  const engagementSection = Object.keys(engagement).length
    ? createElement("div", { class: "analytics-engagement" }, [
        createElement("h3", {}, ["Engagement Metrics"]),
        createElement(
          "ul",
          {},
          Object.entries(engagement).map(([k, v]) =>
            createElement("li", {}, [`${beautifyKey(k)}: ${v}`])
          )
        )
      ])
    : null;

  // 5. Insights
  const insightsSection = Object.keys(insights).length
    ? createElement("div", { class: "analytics-insights" }, [
        createElement("h3", {}, ["Insights"]),
        createElement(
          "ul",
          {},
          Object.entries(insights).map(([k, v]) =>
            createElement("li", {}, [`${beautifyKey(k)}: ${v}`])
          )
        )
      ])
    : null;

  // 6. Top Locations
  const topLocationsSection = topLocations.length
    ? createElement("div", { class: "analytics-top-locations" }, [
        createElement("h3", {}, ["Top Locations"]),
        createElement(
          "ul",
          {},
          topLocations.map((loc) => createElement("li", {}, [String(loc)]))
        )
      ])
    : null;

  const sections: (HTMLElement | null)[] = [
    header,
    summaryCards,
    trendSection,
    engagementSection,
    insightsSection,
    topLocationsSection
  ];

  return createElement(
    "div",
    { class: "analytics-page" },
    sections.filter((section): section is HTMLElement => section !== null)
  );
}

/* ────────────────────── Main Entry ────────────────────── */

export async function renderAnalyticsPage({
  container,
  isLoggedIn,
  entityType = "events",
  entityId = null
}: RenderAnalyticsPageParams): Promise<void> {
  if (!container) return;

  // Clear previous DOM state safely
  container.replaceChildren();

  if (!isLoggedIn) {
    Notify("Please log in to view analytics.", { type: "warning", duration: 3000, dismissible: true });
    return;
  }

  try {
    const data = (await getAnalytics(entityType, entityId)) as AnalyticsData | null;

    if (!data || !data.metrics) {
      Notify("No analytics data found.", { type: "warning", dismissible: true });
      return;
    }

    container.appendChild(renderAnalytics(data));
  } catch (err) {
    Notify("Failed to load analytics data.", { type: "error", dismissible: true });
    console.error("Analytics rendering error:", err);
  }
}