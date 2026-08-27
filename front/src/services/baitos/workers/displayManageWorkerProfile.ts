// displayManageWorkerProfile.ts

import { createElement } from "../../../components/createElement";
import { Button } from "../../../components/base/Button";
import { getWorker, deleteWorker, getBookingsForWorker } from "../api.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths";
import { navigate } from "../../../routes/navigate";
import Imagex from "../../../components/base/Imagex";
import { updateImageWithCrop } from "../../../utils/bannerEditor";
import { displayCreateOrEditBaitoProfile } from "../create/createBaitoProfile";
import Notify from "../../../components/ui/Notify";
import { createTabs } from "../../../utils/persistTabs";
import { Worker } from "./WorkerModal";

// ---------------------------------
// INTERFACES & TYPES
// ---------------------------------

interface BookingItem {
    date: string;
    start: string;
    end?: string;
    status: string;
    [key: string]: any;
}

interface BookingsApiResponse {
    bookings?: BookingItem[];
    [key: string]: any;
}

export async function displayManageWorkerProfile(
    contentContainer: HTMLElement,
    isLoggedIn: boolean,
    workerId: string | number
): Promise<void> {
    const container = createElement("div", { id: "manage-worker-profile-page", class: "manage-worker-profile-page" }) as HTMLElement;
    container.appendChild(createElement("p", { class: "loading-msg" }, ["⏳ Loading profile..."]));
    contentContainer.replaceChildren(container);

    let worker: Worker | null = null;
    try {
        worker = (await getWorker(workerId)) as Worker;
    } catch (e) {
        container.replaceChildren(createElement("p", { class: "error-msg" }, ["⚠️ Failed to load profile."]));
        return;
    }

    if (!worker) {
        container.replaceChildren(createElement("p", { class: "error-msg" }, ["⚠️ Profile not found."]));
        return;
    }

    const layout = createElement("div", { class: "manage-profile-layout" }) as HTMLElement;
    const main = createElement("div", { class: "manage-profile-main" }) as HTMLElement;

    // ===== HEADER =====
    const header = createElement("section", { class: "profile-header card" }, [
        createEditableWorkerPhoto(worker),
        createElement("div", { class: "header-content" }, [
            createElement("h2", {}, [worker.name || "Your Worker Profile"]),
            createElement("p", { class: "profile-id" }, [`Worker ID: ${worker["baitoWorkerId"]}`]),
            createElement("p", { class: "joined-date" }, [`Joined: ${formatDate(worker["createdAt"])}`])
        ])
    ]) as HTMLElement;

    // ===== TABS =====
    const tabsConfig = [
        {
            id: "overview",
            title: "Overview",
            render: (tabContainer: HTMLElement) => {
                tabContainer.replaceChildren(createSectionCard("Profile Summary", [
                    renderDetail("👤", "Name", worker!.name),
                    renderDetail("📞", "Phone", worker!.phone),
                    renderDetail("📍", "Location", worker!.location),
                    renderDetail("🎯", "Specialties", worker!.preferredRoles),
                    renderDetail("📝", "Bio", worker!.bio ? worker!.bio.substring(0, 100) + "..." : "No bio"),
                    createElement("div", { class: "action-buttons" }, [
                        Button("✏️ Edit", "", { click: () => editProfile() }, "buttonx secondary"),
                        Button("🖼️ Update Photo", "", { click: () => updatePhoto() }, "buttonx secondary")
                    ])
                ]));
            }
        },
        {
            id: "details",
            title: "Details",
            render: (tabContainer: HTMLElement) => {
                const aboutCard = worker!.bio ? createSectionCard("About", [
                    createElement("p", { class: "bio-text" }, [worker!.bio])
                ]) : undefined;

                const cards = [
                    createSectionCard("Contact Information", [
                        renderDetail("📞", "Phone", worker!.phone),
                        renderDetail("✉️", "Email", worker["email"]),
                        renderDetail("📍", "Location", worker!.location)
                    ]),
                    createSectionCard("Professional", [
                        renderDetail("⭐", "Experience", worker["experience"]),
                        renderDetail("🛠️", "Skills", worker["skills"]),
                        renderDetail("🌐", "Languages", worker["languages"]),
                        renderDetail("💰", "Expected Wage", worker["expectedWage"] ? `${worker["expectedWage"]} ¥/hr` : "Not set"),
                        renderDetail("💼", "Availability", worker["availability"])
                    ]),
                    aboutCard
                ].filter((card): card is HTMLElement => Boolean(card));

                tabContainer.replaceChildren(...cards);
            }
        },
        {
            id: "documents",
            title: "Documents",
            render: (tabContainer: HTMLElement) => {
                const docs = worker!["documents"];
                if (Array.isArray(docs) && docs.length) {
                    tabContainer.replaceChildren(
                        createSectionCard("Your Documents", [
                            createElement("ul", { class: "document-list" }, docs.map((doc: string, i: number) =>
                                createElement("li", {}, [
                                    createElement("a", {
                                        href: resolveImagePath(EntityType.WORKER, PictureType.DOCUMENT, doc),
                                        target: "_blank"
                                    }, [`📄 Document ${i + 1}`])
                                ])
                            )),
                            Button("📤 Upload Documents", "", { click: () => uploadDocuments() }, "secondary")
                        ])
                    );
                } else {
                    tabContainer.replaceChildren(
                        createSectionCard("Documents", [
                            createElement("p", { class: "empty-state" }, ["No documents uploaded yet"]),
                            Button("📤 Upload Documents", "", { click: () => uploadDocuments() }, "primary")
                        ])
                    );
                }
            }
        },
        {
            id: "bookings",
            title: "Bookings",
            render: (tabContainer: HTMLElement) => {
                const workerIdValue = worker!["baitoWorkerId"];
                if (workerIdValue !== undefined) {
                    loadWorkerBookings(workerIdValue, tabContainer);
                }
            }
        },
        {
            id: "settings",
            title: "Settings",
            render: (tabContainer: HTMLElement) => {
                tabContainer.replaceChildren(createSectionCard("Manage Profile", [
                    createElement("div", { class: "settings-section" }, [
                        createElement("h4", {}, ["Profile Management"]),
                        Button("✏️ Edit Full Profile", "", { click: () => editProfile() }, "secondary"),
                        Button("📸 Update Photo", "", { click: () => updatePhoto() }, "secondary"),
                        Button("🖼️ Manage Gallery", "", { click: () => manageGallery() }, "secondary")
                    ]),
                    createElement("div", { class: "settings-section danger" }, [
                        createElement("h4", {}, ["Danger Zone"]),
                        Button("🗑️ Delete Profile", "", {
                            click: async () => {
                                if (!window.confirm("Are you sure? This cannot be undone.")) {
                                    return;
                                }
                                try {
                                    Notify("Deleting profile...", { type: "info" });
                                    await deleteWorker(worker!["baitoWorkerId"]);
                                    Notify("Profile deleted.", { type: "success" });
                                    navigate("/baitos/hire");
                                } catch (err: any) {
                                    Notify("Failed to delete: " + (err.message || "Unknown error"), { type: "error" });
                                }
                            }
                        }, "danger")
                    ])
                ]));
            }
        }
    ];

    // ===== ACTION HANDLERS =====
    function editProfile(): void {
        contentContainer.replaceChildren();
        displayCreateOrEditBaitoProfile(isLoggedIn, contentContainer, "edit", worker!["baitoWorkerId"]);
    }

    function updatePhoto(): void {
        updateImageWithCrop({
            entityType: EntityType.WORKER,
            imageType: "photo",
            stateKey: "avatar",
            stateEntityKey: "worker",
            previewElementId: "worker-avatar-img",
            pictureType: PictureType.PHOTO,
            entityId: worker!["baitoWorkerId"] ?? ""
        });
    }

    function manageGallery(): void {
        updateImageWithCrop({
            entityType: EntityType.WORKER,
            imageType: "gallery",
            stateKey: "images",
            stateEntityKey: "worker",
            previewElementId: "",
            pictureType: PictureType.GALLERY,
            entityId: worker!["baitoWorkerId"] ?? ""
        });
    }

    function uploadDocuments(): void {
        updateImageWithCrop({
            entityType: EntityType.WORKER,
            imageType: "document",
            stateKey: "documents",
            stateEntityKey: "worker",
            previewElementId: "",
            pictureType: PictureType.DOCUMENT,
            entityId: worker!["baitoWorkerId"] ?? ""
        });
    }

    const tabsContainer = createTabs(tabsConfig, `worker-profile-${worker["baitoWorkerId"]}`, "overview");

    main.replaceChildren(header, tabsContainer);
    layout.appendChild(main);
    container.replaceChildren(layout);
}

// ===== HELPERS =====

function createEditableWorkerPhoto(worker: Worker): HTMLElement {
    const container = createElement("div", { class: "editable-photo-wrapper" }) as HTMLElement;
    const img = Imagex({
        id: "worker-avatar-img",
        src: resolveImagePath(EntityType.WORKER, PictureType.PHOTO, worker.avatar || ""),
        alt: worker.name || "Worker",
        classes: "worker-profile-photo"
    });
    container.appendChild(img);

    return container;
}

function createSectionCard(title: string | null, children: (HTMLElement | null | undefined)[]): HTMLElement {
    return createElement("div", { class: "profile-section card" }, [
        title ? createElement("h3", {}, [title]) : null,
        ...children.filter(Boolean)
    ].filter(Boolean)) as HTMLElement;
}

function renderDetail(icon: string, label: string, value: any): HTMLElement | null {
    if (!value) {
        return null;
    }
    const cleanValue = Array.isArray(value) ? value.join(", ") : String(value);
    return createElement("div", { class: "detail-row" }, [
        createElement("span", { class: "detail-icon" }, [icon]),
        createElement("span", { class: "detail-label" }, [label + ":"]),
        createElement("span", { class: "detail-value" }, [cleanValue])
    ]) as HTMLElement;
}

async function loadWorkerBookings(workerId: string | number, container: HTMLElement): Promise<void> {
    try {
        const res = (await getBookingsForWorker(workerId)) as BookingsApiResponse;
        const bookings = res?.bookings || [];

        if (!bookings.length) {
            container.replaceChildren(
                createSectionCard("Bookings", [
                    createElement("p", { class: "empty-state" }, ["No bookings yet"])
                ])
            );
            return;
        }

        const now = new Date();
        const upcoming = bookings.filter((b: BookingItem) => new Date(`${b.date}T${b.start}`) >= now);
        const past = bookings.filter((b: BookingItem) => new Date(`${b.date}T${b.start}`) < now);

        container.replaceChildren(
            ...[
                upcoming.length > 0 && createSectionCard("Upcoming", [
                    createElement("ul", { class: "booking-list" }, upcoming.map((b: BookingItem) =>
                        createElement("li", { class: `booking-item status-${b.status}` }, [
                            `${b.date} @ ${b.start} - ${b.end || "TBD"} (${b.status})`
                        ])
                    ))
                ]),
                past.length > 0 && createSectionCard("Past Bookings", [
                    createElement("ul", { class: "booking-list past" }, past.map((b: BookingItem) =>
                        createElement("li", { class: `booking-item status-${b.status}` }, [
                            `${b.date} @ ${b.start} (${b.status})`
                        ])
                    ))
                ])
            ].filter(Boolean) as HTMLElement[]
        );
    } catch (err) {
        container.replaceChildren(
            createSectionCard("Bookings", [
                createElement("p", { class: "error-state" }, ["Failed to load bookings"])
            ])
        );
    }
}

function formatDate(timestamp: string | number | undefined): string {
    if (!timestamp) {
        return "Unknown";
    }
    const date = new Date(typeof timestamp === "number" ? timestamp * 1000 : timestamp);
    return date.toLocaleDateString();
}