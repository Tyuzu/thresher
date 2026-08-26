import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import { editEvent } from "./creadit.js";
import { viewEventAnalytics } from "./eventAnalytics.js";
import { reportEntity } from "../reporting/reporting.js";
import { EntityType } from "../../utils/imagePaths.js";
import { starEmptySVG, starFilledSVG } from "../../components/svgs/featherSVGs";
import { createIconButton } from "../../utils/svgIconButton.js";
import { hireVendors } from "../jobs/vendors/vendors.js";
import Bannerx from "../../components/base/Bannerx.js";
import Datex from "../../components/base/Datex.js";

// --- Type Definitions / Interfaces ---

export interface EventDetailData {
    eventid: string | number;
    title?: string;
    name?: string;
    status?: string;
    date: string | Date;
    description?: string;
    category?: string;
    banner?: string;
    tags?: string[];
    social_links?: Record<string, string>;
    custom_fields?: Record<string, string | number>;
    placename?: string;
    placeid?: string | number;
    [key: string]: unknown;
}

interface FieldConfigItem {
    key: keyof EventDetailData;
    label?: string;
    tag: string;
    classes: string[];
    formatter?: (val: any) => any;
}

interface ActionItem {
    text: string;
    onClick: () => void | Promise<unknown>;
    classes?: string[];
}

// Config for displaying event details
const fieldConfig: FieldConfigItem[] = [
    { key: 'title', tag: 'h1', classes: ['event-title'] },
    { key: 'status', tag: 'p', classes: ['event-status'] },
    { key: 'date', tag: 'p', classes: ['event-date'], formatter: d => Datex(d) },
    { key: 'description', tag: 'p', classes: ['event-description'] },
];

const getEventColorClass = (type?: string): string => {
    switch (type?.toLowerCase()) {
        case 'concert': return 'color-concert';
        case 'workshop': return 'color-workshop';
        case 'sports': return 'color-sports';
        case 'meetup': return 'color-meetup';
        case 'festival': return 'color-festival';
        default: return 'color-default';
    }
};

const createDetailItems = (config: FieldConfigItem[], data: EventDetailData): HTMLElement => {
    const details = createElement("div", { class: "eventpage-details" }) as HTMLElement;
    config.forEach(({ key, label, tag, classes, formatter }) => {
        let value: unknown = data[key];
        if (!value) {
            return;
        }
        if (formatter) {
            value = formatter(value);
        }
        const child = label ? `${label}: ${String(value)}` : String(value);
        details.appendChild(createElement(tag as string, { class: classes.join(" ") }, [child]));
    });
    return details;
};

const createTags = (tags?: string[]): HTMLElement | null => {
    if (!tags?.length) {
        return null;
    }
    const container = createElement("div", { class: "event-tags" }) as HTMLElement;
    tags.forEach(tag => container.appendChild(createElement("span", { class: 'event-tag' }, [`#${tag}`])));
    return container;
};

const createSocialLinks = (links?: Record<string, string>): HTMLElement | null => {
    if (!links) {
        return null;
    }
    const container = createElement("div", { class: "event-social-links" }) as HTMLElement;
    Object.entries(links).forEach(([platform, url]) => {
        container.appendChild(createElement("a", { href: url, class: "social-link" }, [platform]));
    });
    return container;
};

const createCustomFields = (fields?: Record<string, string | number>): HTMLElement | null => {
    if (!fields) {
        return null;
    }
    const container = createElement("div", { class: "event-custom-fields" }) as HTMLElement;
    Object.entries(fields).forEach(([field, value]) => {
        container.appendChild(createElement('p', { class: 'custom-field' }, [`${field}: ${value}`]));
    });
    return container;
};

// Save/unsave
const getSavedEvents = (): (string | number)[] => {
    try {
        return JSON.parse(localStorage.getItem("saved_events") || "[]");
    } catch {
        return [];
    }
};

const toggleSaveEvent = (id: string | number): void => {
    let saved = getSavedEvents();
    if (saved.includes(id)) {
        saved = saved.filter(eid => eid !== id);
    } else {
        saved.push(id);
    }
    localStorage.setItem("saved_events", JSON.stringify(saved));
};

const createSaveButton = (eventid: string | number): HTMLElement => {
    const fillStar = createIconButton({
        svgMarkup: starFilledSVG,
        classSuffix: ""
    });
    const emptyStar = createIconButton({
        svgMarkup: starEmptySVG,
        classSuffix: ""
    });

    const isInitiallySaved = getSavedEvents().includes(eventid);

    const icon = createElement(
        "span",
        {
            title: "Save Event",
            events: {
                click: () => {
                    toggleSaveEvent(eventid);
                    const nowSaved = getSavedEvents().includes(eventid);
                    icon.replaceChildren(nowSaved ? fillStar : emptyStar);
                }
            }
        },
        [isInitiallySaved ? fillStar : emptyStar]
    ) as HTMLElement;

    return icon;
};

// Share
const createShareButton = (eventid: string | number): HTMLButtonElement => {
    // Updated to use ButtonOptions object structure
    const btn = Button({
        title: "Share",
        classes: "share-btn",
        events: {
            click: () => {
                navigator.clipboard.writeText(location.origin + `/event/${eventid}`);
                btn.replaceChildren("Link Copied");
                setTimeout(() => btn.replaceChildren("Share"), 1500);
            }
        }
    }) as HTMLButtonElement;
    return btn;
};

// Status badge
const createStatusBadge = (eventDate: string | Date): HTMLElement => {
    const now = Date.now();
    const time = new Date(eventDate).getTime();
    const isPast = time < now;
    return createElement("span", {
        style: `font-size:0.75rem;padding:2px 6px;border-radius:4px;background:${isPast ? "#999" : "darkgreen"};color:white;margin-left:8px;`
    }, [isPast ? "Past" : "Upcoming"]) as HTMLElement;
};

// Countdown
const createCountdown = (eventDate: string | Date): HTMLElement | null => {
    const msLeft = new Date(eventDate).getTime() - Date.now();
    if (msLeft <= 0) {
        return null;
    }
    const days = Math.floor(msLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor(msLeft / (1000 * 60 * 60)) % 24;
    return createElement("p", { class: "event-countdown" }, [`Starts in ${days > 0 ? days + " day(s)" : hours + " hour(s)"}`]);
};

// Place link
const createPlaceLink = (placename: string, placeid: string | number): HTMLElement => createElement('p', {}, [
    createElement('a', { href: `/place/${placeid}` }, [createElement('strong', {}, [`Place: ${placename}`])])
]) as HTMLElement;

/** Banner section */
function createEventBannerSection(eventdata: EventDetailData, isCreator: boolean): HTMLElement {
    return Bannerx({
        isCreator: isCreator,
        bannerkey: eventdata.banner,
        banneraltkey: `Banner for ${eventdata.name || "Event"}`,
        bannerentitytype: EntityType.EVENT,
        stateentitykey: "event",
        bannerentityid: eventdata.eventid
    }) as HTMLElement;
}

// Info section
function createInfoSection(eventData: EventDetailData, isCreator: boolean, isLoggedIn: boolean): HTMLElement {
    const eventInfo = createElement("div", { class: "event-info" }) as HTMLElement;
    const topRow = createElement("div", { class: "event-header-row" }) as HTMLElement;
    const detailBlock = createDetailItems(fieldConfig, eventData);
    const statusBadge = createStatusBadge(eventData.date);
    const countdown = createCountdown(eventData.date);
    const saveBtn = createSaveButton(eventData.eventid);
    createShareButton(eventData.eventid);

    topRow.append(detailBlock, statusBadge, saveBtn);

    const actions: ActionItem[] = [];
    const evanacon = createElement("div", {}, []) as HTMLElement;

    if (isLoggedIn && isCreator) {
        const editeventElement = document.getElementById("editevent") as HTMLElement;
        actions.push({ text: '✏ Edit Event', onClick: () => editEvent(isLoggedIn, eventData.eventid, editeventElement), classes: ['edit-btn', "buttonx"] });
        actions.push({ text: '🗑 Delete Event', onClick: () => deleteEvent(isLoggedIn, eventData.eventid), classes: ['delete-btn', 'buttonx'] });
        actions.push({ text: '📊 View Analytics', onClick: () => viewEventAnalytics(evanacon, isLoggedIn, eventData.eventid), classes: ['analytics-btn', "buttonx"] });
    }
    
    if (isLoggedIn) {
        actions.push({ text: 'Hire Vendors', onClick: () => hireVendors(evanacon, isCreator, isLoggedIn, String(eventData.eventid)), classes: ['analytics-btn', "buttonx"] });
    } else {
        actions.push({ text: 'Report Event', onClick: () => reportEntity(String(eventData.eventid), 'event') });
    }

    eventInfo.append(
        topRow,
        ...(countdown ? [countdown] : []),
        ...(eventData.tags?.length ? [createTags(eventData.tags) as HTMLElement] : []),
        ...(eventData.social_links ? [createSocialLinks(eventData.social_links) as HTMLElement] : []),
        ...(eventData.custom_fields ? [createCustomFields(eventData.custom_fields) as HTMLElement] : []),
        ...(eventData.placename && eventData.placeid ? [createPlaceLink(eventData.placename, eventData.placeid)] : []),
        createElement("div", { class: "event-actions" }, actions.map(a => Button({
            title: a.text,
            classes: a.classes?.join(" "),
            events: { click: a.onClick }
        }))),
        createEditPlaceholder()
    );

    eventInfo.appendChild(evanacon);
    return eventInfo;
}

function createEditPlaceholder(): HTMLElement {
    return createElement("div", { class: "eventedit", id: "editevent" }) as HTMLElement;
}

export async function displayEventDetails(
    content: HTMLElement, 
    eventData: EventDetailData, 
    isCreator: boolean, 
    isLoggedIn: boolean
): Promise<void> {
    content.replaceChildren();
    const wrapper = createElement("div", { class: `event-wrapper ${getEventColorClass(eventData.category)}` }) as HTMLElement;
    const card = createElement("div", { class: "eventx-card hvflex" }) as HTMLElement;

    card.append(createEventBannerSection(eventData, isCreator));
    card.append(createInfoSection(eventData, isCreator, isLoggedIn));

    wrapper.appendChild(card);
    content.appendChild(wrapper);
    content.appendChild(createElement("div", { id: "edittabs" }, []));
}

// Delete Event
async function deleteEvent(isLoggedIn: boolean, eventId: string | number): Promise<void> {
    if (!isLoggedIn) {
        return;
    }
    void eventId;
    return;
}