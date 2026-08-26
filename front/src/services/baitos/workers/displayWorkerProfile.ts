// displayWorkerProfile.ts

import { createElement } from "../../../components/createElement";
import { Button } from "../../../components/base/Button";
import { getWorker, getSlots } from "../api.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths";
import { navigate } from "../../../routes/navigate";
import Imagex from "../../../components/base/Imagex";
import { displayBooking } from "../../booking/booking";
import { getState } from "../../../state/state";
import { meChat } from "../../mechat/plugnplay";
import Notify from "../../../components/ui/Notify";
import { Worker } from "./WorkerModal";

// ---------------------------------
// INTERFACES & TYPES
// ---------------------------------

interface Slot {
    date: string;
    start: string;
    [key: string]: any;
}

interface SlotsApiResponse {
    slots?: Slot[];
    [key: string]: any;
}

export async function displayWorkerProfile(
    contentContainer: HTMLElement,
    isLoggedIn: boolean,
    workerId: string | number
): Promise<void> {
    const container = createElement("div", { id: "worker-profile-page", class: "worker-profile-page" }) as HTMLElement;
    container.appendChild(createElement("p", { class: "loading-msg" }, ["⏳ Loading worker profile..."]));
    contentContainer.replaceChildren(container);

    let worker: Worker | null = null;
    try {
        worker = await getWorker(workerId) as Worker;
    } catch (e) {
        container.replaceChildren(
            createElement("p", { class: "error-msg" }, ["⚠️ Failed to load worker profile."])
        );
        return;
    }

    if (!worker) {
        container.replaceChildren(
            createElement("p", { class: "error-msg" }, ["⚠️ Worker profile not found."])
        );
        return;
    }

    const layout = createElement("div", { class: "worker-profile-layout" }) as HTMLElement;
    const main = createElement("div", { class: "worker-profile-main" }) as HTMLElement;
    const aside = createElement("aside", { class: "worker-profile-aside" }) as HTMLElement;

    const bookingContainer = createElement("div", { class: "booking-container" }) as HTMLElement;
    const slots = await getSlots(worker.baitoWorkerId ?? workerId);

    // ===== HEADER =====
    const header = createElement("section", { class: "worker-profile-header card" }, [
        createWorkerPhoto(worker),
        createElement("div", { class: "worker-header-content" }, [
            createElement("h2", {}, [worker.name || "Unnamed Worker"]),
            createNextAvailability(slots),
            createElement("div", { class: "worker-header-actions" }, [
                renderHireAction(isLoggedIn, bookingContainer, worker)
            ])
        ])
    ]) as HTMLElement;

    // ===== DETAILS CARDS =====
    const detailCards = [
        createSectionCard("Contact", [
            renderDetail("📞", "Phone", worker.phone),
            renderDetail("✉️", "Email", worker.email),
            renderDetail("📍", "Location", worker.location)
        ]),
        createSectionCard("Professional", [
            renderDetail("🎯", "Roles", worker.preferredRoles),
            renderDetail("⭐", "Experience", worker.experience),
            renderDetail("🛠️", "Skills", worker.skills),
            renderDetail("💰", "Expected Wage", worker.expectedWage ? `${worker.expectedWage} ¥/hr` : null),
            renderDetail("💼", "Availability", worker.availability),
            renderDetail("🌐", "Languages", worker.languages)
        ]),
        worker.bio && createSectionCard("About", [createElement("p", {}, [worker.bio])])
    ].filter(Boolean) as HTMLElement[];

    const documentsSection = createDocumentsSection(worker);
    const bookingSection = createSectionCard("Schedule", [bookingContainer]);

    main.replaceChildren(header, ...detailCards);
    if (documentsSection) {
        main.appendChild(documentsSection);
    }
    main.appendChild(bookingSection);

    // ===== SIDEBAR =====
    const sidebarItems = createSidebarActions(worker, isLoggedIn);
    aside.replaceChildren(
        createElement("h3", {}, ["Actions"]),
        createElement("ul", {}, sidebarItems.map(item => createElement("li", {}, [item]))),
        Button("← Back to List", "back-btn", { click: () => navigate("/baitos/hire") }, "secondary")
    );

    layout.append(main, aside);
    container.replaceChildren(layout);
    
    const userState = getState("user") as { userid?: string | number } | null;
    const currentUser = userState?.userid;
    
    // Determine if the visitor owns this profile or is an authorized administrator
    const isOwnerOrAdmin = worker.userid === currentUser;
    
    // Load booking widget
    try {
        displayBooking(
            {
                entityType: "worker",
                entityId: worker.baitoWorkerId ?? workerId,
                entityCategory: "Worker",
                userId: currentUser !== undefined ? String(currentUser) : "guest",
                isAdmin: isOwnerOrAdmin
            },
            bookingContainer
        );
    } catch (bookingError) {
        console.error("Booking widget failed to initialize:", bookingError);
        bookingContainer.replaceChildren(
            createElement("p", { class: "error-text" }, ["Booking system currently unavailable."])
        );
    }
}

// ===== HELPERS =====

// slots are provided by baitos API helper via `getSlots`

function createNextAvailability(slots: Slot[]): HTMLElement {
    if (!slots?.length) {
        return createElement("div", { class: "next-availability none" }, ["No upcoming slots"]) as HTMLElement;
    }

    const now = new Date();
    const nextSlot = slots
        .filter(s => new Date(s.date) >= now)
        .sort((a, b) => new Date(`${a.date}T${a.start}`).getTime() - new Date(`${b.date}T${b.start}`).getTime())[0];

    if (!nextSlot) {
        return createElement("div", { class: "next-availability none" }, ["No upcoming availability"]) as HTMLElement;
    }

    return createElement("div", { class: "next-availability" }, [
        createElement("strong", {}, ["Next available:"]),
        createElement("span", {}, [` ${nextSlot.date} at ${nextSlot.start}`])
    ]) as HTMLElement;
}

function renderHireAction(isLoggedIn: boolean, bookingContainer: HTMLElement, _worker: Worker): HTMLElement {
    if (!isLoggedIn) {
        return createElement("p", { class: "login-msg" }, ["🔒 Login to book"]) as HTMLElement;
    }

    return Button("Book Now", "hire-btn", {
        click: () => bookingContainer.scrollIntoView({ behavior: "smooth" })
    }, "primary") as HTMLElement;
}

function createSectionCard(title: string, children: (HTMLElement | null)[]): HTMLElement {
    return createElement("div", { class: "profile-section card" }, [
        createElement("h3", {}, [title]),
        ...children.filter(Boolean)
    ]) as HTMLElement;
}

function renderDetail(icon: string, label: string, value: any): HTMLElement | null {
    if (!value) {
        return null;
    }
    const cleanValue = Array.isArray(value) ? value.join(", ") : String(value);
    return createElement("div", { class: "detail-row" }, [
        icon + " ",
        `${label}: `,
        cleanValue
    ]) as HTMLElement;
}

function createWorkerPhoto(worker: Worker): HTMLElement {
    return Imagex({
        src: resolveImagePath(EntityType.WORKER, PictureType.PHOTO, worker.avatar || ""),
        alt: worker.name || "Worker",
        classes: "worker-profile-photo"
    });
}

function createDocumentsSection(worker: Worker): HTMLElement | null {
    if (!worker.documents?.length) {
        return null;
    }

    return createSectionCard("Documents", [
        createElement("ul", { class: "document-list" }, worker.documents.map((doc: string, i: number) =>
            createElement("li", {}, [
                createElement("a", {
                    href: resolveImagePath(EntityType.WORKER, PictureType.DOCUMENT, doc),
                    target: "_blank"
                }, [`📄 Document ${i + 1}`])
            ])
        ))
    ]);
}

function createSidebarActions(worker: Worker, isLoggedIn: boolean): HTMLElement[] {
    const items: HTMLElement[] = [];

    items.push(
        Button("💬 Message", "", {
            click: () => {
                if (!isLoggedIn) {
                    Notify("Login required", { type: "warning" });
                    return;
                }
                if (worker.userid) {
                    meChat(worker.userid, "worker", worker.baitoWorkerId ?? "");
                }
            }
        }, "secondary") as HTMLElement
    );

    // Dynamic Favorite Button Action
    const favList: (string | number)[] = JSON.parse(localStorage.getItem("favoriteWorkers") || "[]");
    const workerIdKey = worker.baitoWorkerId ?? "";
    const isCurrentlyFav = favList.includes(workerIdKey);

    const favBtn = Button(
        isCurrentlyFav ? "❤️ Saved" : "⭐ Save",
        "fav-btn",
        {
            click: () => {
                let currentFavs: (string | number)[] = JSON.parse(localStorage.getItem("favoriteWorkers") || "[]");
                if (currentFavs.includes(workerIdKey)) {
                    // Remove from Favorites
                    currentFavs = currentFavs.filter(id => id !== workerIdKey);
                    localStorage.setItem("favoriteWorkers", JSON.stringify(currentFavs));
                    favBtn.textContent = "⭐ Save";
                    Notify("Removed from favorites.", { type: "info" });
                } else {
                    // Add to Favorites
                    currentFavs.push(workerIdKey);
                    localStorage.setItem("favoriteWorkers", JSON.stringify(currentFavs));
                    favBtn.textContent = "❤️ Saved";
                    Notify("Added to favorites!", { type: "success" });
                }
            }
        },
        "secondary"
    ) as HTMLElement;

    items.push(favBtn);
    return items;
}