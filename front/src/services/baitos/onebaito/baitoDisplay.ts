// baitoDisplay.ts

import { createElement } from "../../../components/createElement";
import { SRC_URL } from "../../../api/api";
import { deleteBaito, applyToBaito, reportBaito, fetchRelated, getBaito } from "../api.js";
import { getState } from "../../../state/state";
import { navigate } from "../../../routes/navigate";
import { createOrEditBaito } from "../create/createOrEditBaito";
import Button from "../../../components/base/Button";
import { showApplicantsModal } from "../dash/BaitoDash";
import { displayReviews } from "../../reviews/displayReviews";
import Notify from "../../../components/ui/Notify";
import { meChat } from "../../mechat/plugnplay";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths";
import Imagex from "../../../components/base/Imagex";
import Bannerx from "../../../components/base/Bannerx";
import Datex from "../../../components/base/Datex";

// ---------------------------------
// INTERFACES & TYPES
// ---------------------------------

interface Employer {
    avatar?: string;
    name?: string;
    verified?: boolean;
    [key: string]: any;
}

interface Coords {
    lat: number;
    lng: number;
    [key: string]: any;
}

export interface Baito {
    baitoid: string | number;
    title?: string;
    banner?: string;
    ownerId?: string | number;
    employer?: Employer;
    wage?: string | number;
    lastdate?: string | number | Date;
    category?: string;
    subcategory?: string;
    workHours?: string;
    duration?: string;
    location?: string;
    phone?: string;
    createdAt?: string | number | Date;
    applicationcount?: number;
    tags?: string[];
    requirements?: string | string[];
    description?: string;
    coords?: Coords;
    [key: string]: any;
}

interface UserState {
    userid?: string | number | { id?: string | number; [key: string]: any };
    [key: string]: any;
}

/** Open chat with employer */
function startChatWithEmployer(userId: string | number | undefined, baitoId: string | number): void {
    if (userId !== undefined) {
        meChat(userId, "baito", baitoId);
    }
}

/** Notify stubs */
function uploadResumeFeature(): void {
    Notify("Resume upload feature is under development.", { type: "info", duration: 3000, dismissible: true });
}

/** Expandable description */
function renderExpandableDescription(text: string = ""): HTMLElement {
    const descP = createElement("p", { class: "baito-description" }) as HTMLElement;
    const isLong = text.length > 300;
    descP.textContent = isLong ? `${text.slice(0, 300)}…` : text;

    if (!isLong) {
        return descP;
    }

    const container = createElement("div", { class: "baito-description-container" }, [descP]) as HTMLElement;
    const btn = Button({
        title: "Show More",
        id: "toggle-desc",
        events: {
            click: () => {
                descP.textContent = text;
                btn.remove();
            }
        },
        classes: "btn btn-secondary btn-sm mt-1"
    }) as HTMLElement;

    container.appendChild(btn);
    return container;
}

/** Edit job wrapper */
function editBaito(baito: Baito, isLoggedIn: boolean, container: HTMLElement): void {
    // createOrEditBaito expects BaitoData with requirements as string
    const normalized = {
        ...baito,
        requirements: Array.isArray(baito.requirements) ? (baito.requirements as string[]).join("\n") : (baito.requirements || "")
    } as any;
    createOrEditBaito({ isLoggedIn, contentContainer: container, baito: normalized, mode: "edit" });
}

/** Owner controls */
function renderOwnerControls(baito: Baito, container: HTMLElement, isLoggedIn: boolean): HTMLElement {
    return createElement("div", { class: "baito-owner-controls button-group" }, [
        Button({
            title: "✏️ Edit Job",
            id: "baito-edit-btn",
            events: { click: () => editBaito(baito, isLoggedIn, container) },
            classes: "buttonx btn-secondary"
        }),
        Button({
            title: `📨 View Applicants (${baito.applicationcount || 0})`,
            id: "view-applicants-btn",
            events: { click: () => showApplicantsModal(baito) },
            classes: "buttonx btn-secondary"
        }),
        Button({
            title: "🗑 Delete Job",
            id: "delete-baito-btn",
            events: {
                click: async () => {
                    if (!window.confirm("Delete this job permanently?")) {
                        return;
                    }
                    try {
                        await deleteBaito(baito.baitoid);
                        Notify("✅ Deleted", { type: "success", duration: 3000, dismissible: true });
                        navigate("/baitos");
                    } catch {
                        Notify("❌ Failed to delete.", { type: "error", duration: 3000, dismissible: true });
                    }
                }
            },
            classes: "buttonx btn-danger"
        }),
        Button({
            title: "Chats",
            id: "chats-btn-baito",
            events: { click: () => navigate("/merechats") },
            classes: "buttonx btn-secondary"
        }),
        Button({
            title: "Close job",
            id: "close-btn-baito",
            events: {
                click: () => {
                    Notify("Closing jobs is not available yet. Please edit the listing instead.", { type: "info", duration: 3000, dismissible: true });
                }
            },
            classes: "buttonx btn-secondary"
        }),
    ]) as HTMLElement;
}

function hasValidDeadline(value: any): boolean {
    if (!value) return false;
    const date = value instanceof Date ? value : new Date(value);
    return !Number.isNaN(date.getTime()) && date.getUTCFullYear() > 1;
}

function isBaitoExpired(baito: Baito): boolean {
    if (!hasValidDeadline(baito?.lastdate)) return false;
    const deadline = baito.lastdate instanceof Date ? baito.lastdate : new Date(baito.lastdate ?? Date.now());
    return deadline < new Date();
}

/** Applicant controls */
function renderApplicantControls(baito: Baito, baitoid: string | number, isOwner: boolean, container: HTMLElement, isLoggedIn: boolean): HTMLElement {
    const expired = isBaitoExpired(baito);
    return createElement("div", { class: "baito-user-controls button-group" }, [
        Button({
            title: expired ? "⏳ Job Expired" : "📩 Apply / Contact",
            id: "apply-btn",
            events: {
                click: async (e: MouseEvent) => {
                    if (expired) {
                        Notify("This job is no longer accepting applications.", { type: "warning", duration: 3000, dismissible: true });
                        return;
                    }
                    if (!isLoggedIn) {
                        Notify("Please log in to apply for this job.", { type: "warning", duration: 3000, dismissible: true });
                        return;
                    }
                    const pitch = window.prompt("Write a short message to the employer:");
                    if (pitch === null) return; // User clicked "Cancel"
                    if (!pitch.trim()) {
                        Notify("Please write a small pitch message.", { type: "warning", duration: 3000, dismissible: true });
                        return;
                    }

                    const btn = e.currentTarget as HTMLButtonElement;
                    btn.disabled = true;
                    btn.textContent = "Applying...";

                    try {
                        const form = new FormData();
                        form.append("pitch", pitch.trim());
                        const res = (await applyToBaito(baitoid, form)) as { success?: boolean; message?: string };
                        Notify(res?.success ? "✅ Application sent!" : (res?.message || "Applied successfully"), { type: "success", duration: 3000, dismissible: true });
                        btn.textContent = "Applied";
                    } catch {
                        Notify("❌ Failed to apply.", { type: "error", duration: 3000, dismissible: true });
                        btn.disabled = false;
                        btn.textContent = "📩 Apply / Contact";
                    }
                }
            },
            classes: `buttonx btn-primary${expired ? " disabled" : ""}`
        }),

        Button({
            title: "⭐ Save Job",
            id: "save-job-btn",
            events: {
                click: () => {
                    const saved = JSON.parse(localStorage.getItem("savedJobs") || "[]") as (string | number)[];
                    if (!saved.includes(baito.baitoid)) {
                        saved.push(baito.baitoid);
                        localStorage.setItem("savedJobs", JSON.stringify(saved));
                        Notify("Saved to bookmarks!", { type: "success", duration: 3000, dismissible: true });
                    } else {
                        Notify("This job is already bookmarked.", { type: "info", duration: 3000, dismissible: true });
                    }
                }
            },
            classes: "buttonx btn-bookmark"
        }),

        Button({
            title: "🚩 Report Listing",
            id: "report-btn",
            events: {
                click: async () => {
                    const reason = window.prompt("Why are you reporting this job?");
                    if (!reason?.trim()) return;
                    try {
                        await reportBaito(baitoid, { reason: reason.trim() });
                        Notify("✅ Report submitted", { type: "success", duration: 3000, dismissible: true });
                    } catch {
                        Notify("❌ Failed to report", { type: "error", duration: 3000, dismissible: true });
                    }
                }
            },
            classes: "buttonx btn-danger"
        }),

        Button({
            title: "💬 Chat with Employer",
            id: "chat-btn",
            events: { click: () => startChatWithEmployer(baito.ownerId, baitoid) },
            classes: "buttonx btn-secondary"
        }),
        Button({
            title: "📎 Upload Resume",
            id: "upload-resume-btn",
            events: { click: uploadResumeFeature },
            classes: "buttonx btn-secondary"
        }),
        Button({
            title: "💬 Reviews",
            id: "leave-review-btn",
            events: { click: () => displayReviews(container, isOwner, isLoggedIn, "baito", baitoid) },
            classes: "buttonx btn-secondary"
        })
    ]) as HTMLElement;
}

/** Fetch related jobs */
async function fetchSimilarJobs(category: string, excludeId: string | number): Promise<Baito[]> {
    try {
        const jobs = (await fetchRelated(category, excludeId)) as Baito[] || [];
        return jobs.filter(j => j.baitoid !== excludeId);
    } catch {
        console.warn("Failed to load similar jobs");
        return [];
    }
}

/** Employer info */
function createEmployerSection(employer: Employer | undefined, baito: Baito): HTMLElement {
    if (!employer) {
        return createElement("div", { class: "baito-employer" }, [
            createElement("span", {}, [`Employer ID: ${baito.ownerId}`])
        ]) as HTMLElement;
    }
    const avatar = employer.avatar ? Imagex({ src: employer.avatar, alt: "Employer Avatar", classes: "employer-avatar" }) : null;
    const name = createElement("span", { class: "employer-name" }, [employer.name || "Anonymous Employer"]);
    const verifiedBadge = employer.verified ? createElement("span", { class: "verified-badge" }, ["✅ Verified"]) : null;
    
    return createElement("div", { class: "baito-employer" }, [avatar, name, verifiedBadge].filter(Boolean)) as HTMLElement;
}

/** Job meta info */
function createMetaSection(baito: Baito): HTMLElement {
    const wageText = isNaN(Number(baito.wage)) ? baito.wage : `¥${Number(baito.wage).toLocaleString()}/hour`;
    const hasDeadline = hasValidDeadline(baito.lastdate);

    const metaLines = [
        baito.category && baito.subcategory ? `📂 ${baito.category} › ${baito.subcategory}` : baito.category ? `📂 ${baito.category}` : null,
        baito.wage ? `💴 Wage: ${wageText}` : null,
        baito.workHours ? `⏰ Hours: ${baito.workHours}` : null,
        baito.duration ? `🗓️ Duration: ${baito.duration}` : null,
        baito.location ? `📍 Location: ${baito.location}` : null,
        baito.phone ? `📞 Contact: ${baito.phone}` : null,
        hasDeadline ? `⏳ Apply by: ${Datex(baito.lastdate, true)}` : null,
        baito.createdAt ? `📅 Posted: ${Datex(baito.createdAt, true)}` : null,
        typeof baito.applicationcount === "number" ? `👥 Applications: ${baito.applicationcount}` : null,
    ].filter(Boolean) as string[];

    return createElement("div", { class: "baito-meta" }, metaLines.map(line => createElement("p", { class: "meta-item" }, [line]))) as HTMLElement;
}

/** Tags section */
function createTagsSection(tags: string[] | undefined): HTMLElement | null {
    if (!Array.isArray(tags) || !tags.length) return null;
    return createElement("div", { class: "baito-tags" }, 
        tags.map(tag => createElement("span", { class: "baito-tag" }, [`#${tag.trim()}`]))
    ) as HTMLElement;
}

/** Requirements section */
function createRequirementsSection(requirements: string | string[] | undefined): HTMLElement | null {
    if (!requirements || (Array.isArray(requirements) && !requirements.length)) return null;
    const reqs = Array.isArray(requirements) ? requirements : [requirements];
    return createElement("div", { class: "baito-reqs" }, [
        createElement("strong", { class: "reqs-title" }, ["📌 Requirements"]),
        createElement("ul", { class: "reqs-list" }, reqs.map(r => createElement("li", {}, [r]))),
    ]) as HTMLElement;
}

/** Banner section */
function createBaitoBannerSection(baito: Baito, isCreator: boolean): HTMLElement {
    return Bannerx({
        isCreator: isCreator,
        bannerkey: baito.banner,
        banneraltkey: `Banner for ${baito.title || "Baito"}`,
        bannerentitytype: EntityType.BAITO,
        stateentitykey: "baito",
        bannerentityid: baito.baitoid
    });
}

/** Similar jobs section with improved cards */
async function getSimilarJobsElement(category: string, excludeId: string | number): Promise<HTMLElement | null> {
    const similarJobs = await fetchSimilarJobs(category, excludeId);
    if (!similarJobs.length) return null;

    const details = createElement("details", { class: "baito-related-details" }, [
        createElement("summary", {}, ["🔎 Similar Jobs"]),
    ]) as HTMLElement;

    similarJobs.slice(0, 4).forEach(job => {
        const wageText = isNaN(Number(job.wage)) ? job.wage : `¥${Number(job.wage).toLocaleString()}/hour`;
        const bannerSrc = job.banner
            ? resolveImagePath(EntityType.BAITO, PictureType.BANNER, job.banner)
            : `${SRC_URL}/images/placeholder-banner.png`;

        const card = createElement("div", { class: "baito-related-card card" }, [
            Imagex({ src: bannerSrc, alt: job.title || "Job Banner", classes: "related-card-banner" }),
            createElement("div", { class: "related-card-content" }, [
                createElement("h4", { class: "related-card-title" }, [job.title || "Untitled"]),
                job.location ? createElement("p", { class: "related-card-location" }, [`📍 ${job.location}`]) : null,
                job.wage ? createElement("p", { class: "related-card-wage" }, [`💴 ${wageText}`]) : null,
                Button({
                    title: "View",
                    events: { click: () => navigate(`/baito/${job.baitoid}`) },
                    classes: "btn btn-sm btn-primary related-card-btn"
                }),
            ].filter(Boolean)),
        ]);

        details.appendChild(card);
    });

    return details;
}

/** Main display function */
export async function displayBaito(
    isLoggedIn: boolean,
    baitoid: string | number,
    contentContainer: HTMLElement
): Promise<void> {
    contentContainer.replaceChildren();
    
    try {
        const baito = (await getBaito(baitoid)) as Baito;
        if (!baito) {
            throw new Error("Baito not found");
        }

        // Safety: Check if nested user object contains matching ID
        const userState = getState("user") as UserState | null;
        const loggedInUser = userState?.userid;
        const isOwner = loggedInUser !== undefined && (
            (typeof loggedInUser === "object" && loggedInUser !== null && (loggedInUser.id === baito.ownerId)) ||
            loggedInUser === baito.ownerId
        );

        const section = createElement("div", { class: "baito-detail-wrapper" }) as HTMLElement;
        section.appendChild(createElement("h2", { class: "baito-title" }, [baito.title || "Untitled Job"]));
        section.appendChild(createBaitoBannerSection(baito, isOwner));

        const employerSection = createEmployerSection(baito.employer, baito);
        if (employerSection) section.appendChild(employerSection);

        section.appendChild(createMetaSection(baito));

        const tagsSection = createTagsSection(baito.tags);
        if (tagsSection) section.appendChild(tagsSection);

        const reqSection = createRequirementsSection(baito.requirements);
        if (reqSection) section.appendChild(reqSection);

        if (baito.description) {
            section.appendChild(renderExpandableDescription(baito.description));
        }

        // Review and action panels
        const reviewSec = createElement("div", { class: "baito-review-section" }) as HTMLElement;
        const controls = isOwner
            ? renderOwnerControls(baito, contentContainer, isLoggedIn)
            : renderApplicantControls(baito, baitoid, isOwner, reviewSec, isLoggedIn);

        section.appendChild(controls);
        section.appendChild(reviewSec);

        // Dynamic Map integration
        if (baito.coords?.lat && baito.coords?.lng) {
            createElement("div", {
                class: "baito-map-container",
                style: "height: 300px; margin: 20px 0; border-radius: 8px; overflow: hidden;"
            });
            // Map container logic can be hooked here if needed
        }

        // Fetch and append related jobs element cleanly to avoid async DOM layout flashes
        if (baito.category) {
            const similarJobsEl = await getSimilarJobsElement(baito.category, baitoid);
            if (similarJobsEl) {
                section.appendChild(similarJobsEl);
            }
        }

        contentContainer.appendChild(section);
    } catch (error) {
        contentContainer.appendChild(createElement("p", { class: "error-message" }, ["🚫 Unable to load job details. Please try again later."]));
        console.error("Failed to fetch baito:", error);
    }
}