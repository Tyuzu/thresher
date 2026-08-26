import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import Imagex from "../../components/base/Imagex.js";
import { navigate } from "../../routes/navigate.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { adspace } from "../../services/ads/newads.js";
import { fetchEventsPage } from "./api.js";
import Datex from "../../components/base/Datex.js";
import { createMainLayout } from "../../components/layout/mainLayout.js";
import { createAsideContent } from "../../components/layout/asideLayout.js";

// --- Type Definitions / Interfaces ---

export interface EventItem {
    eventid: string | number;
    title?: string;
    date: string | Date;
    placename?: string;
    category?: string;
    prices?: number[];
    currency?: string;
    banner?: string;
    [key: string]: unknown;
}

export async function displayEvents(isLoggedIn: boolean, container: HTMLElement): Promise<void> {
    container.replaceChildren();

    const PAGE_NAME = "events";

    // ---------- SIDEBAR SECTIONS ----------
    const actionButtons: HTMLElement[] = [];
    if (isLoggedIn) {
        actionButtons.push(
            Button({
                title: "Create Event",
                id: "crt-evnt",
                classes: "buttonx primary",
                events: { click: () => navigate("/create-event") }
            })
        );
    }

    actionButtons.push(
        Button({
            title: "Browse Artists",
            id: "artsts-brws",
            classes: "buttonx primary",
            events: { click: () => navigate("/artists") }
        }),
        Button({
            title: "My Events",
            id: "btn-my-events",
            classes: "buttonx secondary",
            events: { click: () => navigate("/my-events") }
        }),
        Button({
            title: "Event Calendar",
            id: "btn-event-calendar",
            classes: "buttonx secondary",
            events: { click: () => navigate("/event-calendar") }
        })
    );

    const actionsWrapper = createElement("div", { class: "aside-actions-group" }, actionButtons);

    // Sidebar Ad component
    const sidebarAd = adspace("aside", PAGE_NAME, {
        layout: "vertical",
        width: 300,
        height: 250,
        refreshInterval: 30000,
    });

    const asideContent = createAsideContent({
        title: "Events Overview",
        sections: [
            {
                title: "Actions",
                content: actionsWrapper,
                className: "aside-actions-section",
            },
            {
                content: sidebarAd,
                className: "aside-ad-section",
            },
        ],
        showAd: false, // Explicitly set false to use custom integrated ad space
        page: PAGE_NAME,
    });

    // ---------- MAIN HEADER & INBODY AD ----------
    const mainHeader = [
        createElement("h1", {}, ["All Events"]),
        adspace("inbody", PAGE_NAME, {
            layout: "horizontal",
            width: 728,
            height: 90,
            refreshInterval: 45000,
        }),
    ];

    // ---------- LAYOUT ----------
    const layout = createMainLayout({
        mainContent: mainHeader,
        asideContent,
        pageClass: "events-page",
    }) as HTMLElement;

    container.append(layout);

    const mainElement = layout.querySelector(".layout-main") as HTMLElement | null;
    const list = createElement("div", { class: "events-list" });

    // ---------- FETCH EVENTS ----------
    let events: EventItem[] = [];
    try {
        const resp = await fetchEventsPage(1, 1000);
        events = Array.isArray(resp) ? resp : resp?.data || resp?.events || [];
    } catch (err) {
        console.error("Failed to load events", err);
    }

    // ---------- RENDER LIST ----------
    if (!events.length) {
        list.append(createElement("p", {}, ["No events found."]));
    } else {
        events.forEach((ev, idx) => {
            list.append(createEventCard(ev));

            // Inject an in-list ad after every 5th event card
            if ((idx + 1) % 5 === 0) {
                list.append(
                    adspace("inlist", PAGE_NAME, {
                        layout: "vertical",
                        width: "100%",
                        height: 120,
                    })
                );
            }
        });
    }

    if (mainElement) {
        mainElement.append(list);
    }
}

// ---------- CARD BUILDER ----------
function createEventCard(ev: EventItem): HTMLElement {
    const minPrice = Array.isArray(ev.prices) ? Math.min(...ev.prices) : 0;
    const currency = ev.currency || "USD";
    const priceDisplay = minPrice > 0 ? `${currency} ${minPrice}` : "Free";

    const isPast = new Date(ev.date).getTime() < Date.now();
    const savedEvents = getSavedEvents();
    let isSaved = savedEvents.includes(ev.eventid);

    const saveToggle = createElement(
        "span",
        {
            title: "Save Event",
            style: `cursor:pointer;font-size:18px;color:${isSaved ? "gold" : "gray"};margin-left:auto;`,
            events: {
                click: (e: Event) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleSaveEvent(ev.eventid);
                    isSaved = !isSaved;
                    saveToggle.textContent = isSaved ? "★" : "☆";
                    saveToggle.style.color = isSaved ? "gold" : "gray";
                },
            },
        },
        [isSaved ? "★" : "☆"]
    ) as HTMLElement;

    const shareBtn = createElement(
        "button",
        {
            type: "button",
            style: "font-size:12px;margin-top:4px;",
            events: {
                click: (e: Event) => {
                    e.preventDefault();
                    navigator.clipboard.writeText(`${location.origin}/event/${ev.eventid}`);
                    shareBtn.textContent = "Link Copied";
                    setTimeout(() => (shareBtn.textContent = "Share"), 1500);
                },
            },
        },
        ["Share"]
    ) as HTMLButtonElement;

    const statusLabel = createElement(
        "span",
        {
            style: (`font-size:0.75rem;padding:2px 6px;border-radius:4px;background:${
                isPast ? "#888" : "#28a745"
            };color:white;margin-left:8px;`) as any,
        },
        [isPast ? "Past" : "Upcoming"]
    );

    const bannerUrl = resolveImagePath(EntityType.EVENT, PictureType.THUMB, ev.banner);
    const bannerImg = Imagex({
        src: bannerUrl,
        alt: `${ev.title || "Event"} Banner`,
        loading: "lazy",
        style: ("width:100%;aspect-ratio:16/9;object-fit:cover;") as any,
    });

    const bannerLink = createElement(
        "a",
        {
            class: "event-link",
            events: { click: () => navigate(`/event/${ev.eventid}`) },
        },
        [bannerImg]
    );

    const eventInfo = createElement("div", { class: "event-info" }, [
        createElement("div", { style: ("display:flex;align-items:center;gap:8px;") as any }, [
            createElement("h2", {}, [ev.title || "Untitled"]),
            statusLabel,
            saveToggle,
        ]),
        createElement("p", {}, [createElement("strong", {}, ["Date: "]), Datex(ev.date)]),
        createElement("p", {}, [createElement("strong", {}, ["Place: "]), ev.placename || "-"]),
        createElement("p", {}, [createElement("strong", {}, ["Category: "]), ev.category || "-"]),
        createElement("p", {}, [createElement("strong", {}, ["Price: "]), priceDisplay]),
        shareBtn,
    ]);

    return createElement("div", { class: "event-card" }, [bannerLink, eventInfo]);
}

function getSavedEvents(): (string | number)[] {
    try {
        return JSON.parse(localStorage.getItem("saved_events") || "[]");
    } catch {
        return [];
    }
}

function toggleSaveEvent(id: string | number): void {
    let saved = getSavedEvents();
    saved = saved.includes(id) ? saved.filter((eid) => eid !== id) : [...saved, id];
    localStorage.setItem("saved_events", JSON.stringify(saved));
}