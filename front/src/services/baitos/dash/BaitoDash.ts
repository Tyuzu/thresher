// BaitoDash.ts

import { getApplications, deleteApplication, getMine, getApplicants } from "../api.js";
import { createElement } from "../../../components/createElement";
import { formatRelativeTime } from "../../../utils/dateUtils";
import { navigate } from "../../../routes/navigate";
import Notify from "../../../components/ui/Notify";
import Modal from "../../../components/ui/Modal";
import Button from "../../../components/base/Button";
import Datex from "../../../components/base/Datex";

// ---------------------------------
// INTERFACES & TYPES
// ---------------------------------

export interface Application {
    _id: string | number;
    title?: string;
    location?: string;
    wage?: string | number;
    status?: string;
    pitch?: string;
    submittedAt?: string | number | Date;
    feedback?: string;
    jobId: string | number;
    [key: string]: any;
}

export interface BaitoJob {
    baitoid: string | number;
    title?: string;
    location?: string;
    wage?: string | number;
    applicationsCount?: number;
    [key: string]: any;
}

export interface Applicant {
    _id?: string | number;
    username?: string;
    pitch?: string;
    submittedAt?: string | number | Date;
    [key: string]: any;
}

// ---------------- Applicant Dashboard ----------------
export async function baitoApplicantDash(container: HTMLElement): Promise<void> {
    container.replaceChildren();

    const wrapper = createElement("div", { class: "baitosdashpage" }) as HTMLElement;
    container.appendChild(wrapper);

    wrapper.appendChild(createElement("h2", {}, ["📥 Your Baito Applications"]));

    let applications: Application[] = [];
    try {
        applications = (await getApplications()) as Application[];
    } catch {
        wrapper.appendChild(createElement("p", { class: "error" }, ["❌ Failed to load applications."]));
        return;
    }

    if (!applications.length) {
        wrapper.appendChild(createElement("p", { class: "empty-state" }, ["You haven’t applied for any baito jobs yet."]));
        return;
    }

    // --- Filters ---
    const filterRow = createElement("div", { class: "filter-row" }) as HTMLElement;
    const statusFilter = createElement("select", { id: "status-filter" }, [
        createElement("option", { value: "" }, ["All Statuses"]),
        ...["Submitted", "Viewed", "Shortlisted", "Interview Scheduled", "Rejected", "Hired"].map(status =>
            createElement("option", { value: status }, [status])
        )
    ]) as HTMLSelectElement;
    
    const searchInput = createElement("input", { type: "text", placeholder: "Search by job title", class: "search-input" }) as HTMLInputElement;

    filterRow.append(statusFilter, searchInput);
    wrapper.appendChild(filterRow);

    const list = createElement("div", { class: "application-list" }) as HTMLElement;
    wrapper.appendChild(list);

    function render(filteredApps: Application[]): void {
        list.replaceChildren();

        if (!filteredApps.length) {
            list.appendChild(createElement("p", { class: "empty" }, ["No applications match your filter."]));
            return;
        }

        filteredApps.forEach(app => {
            const card = createElement("div", { class: "application-card" }) as HTMLElement;

            card.append(
                createElement("h4", {}, [app.title || "Untitled Job"]),
                createElement("p", { class: "meta" }, [`📍 ${app.location || "Unknown"} • 💴 ¥${app.wage || "?"}/hr`]),
                createElement("p", { class: "status" }, [`📌 Status: ${app.status || "Pending"}`]),
                createElement("p", {}, [`📝 Pitch: ${app.pitch || "—"}`]),
                createElement("p", {}, [`📅 ${formatRelativeTime(app.submittedAt ?? Date.now())}`])
            );

            if (app.feedback) {
                card.appendChild(createElement("p", { class: "feedback" }, [`📩 Feedback: ${app.feedback}`]));
            }

            const viewBtn = Button({
                title: "🔎 View Listing",
                events: {
                    click: () => navigate(`/baito/${app.jobId}`)
                },
                classes: "buttonx btn-secondary"
            }) as HTMLElement;

            const withdrawBtn = Button({
                title: "❌ Withdraw",
                events: {
                    click: async () => {
                        const modalInstance = Modal({
                            title: "Confirm Withdrawal",
                            content: createElement("p", {}, [`Are you sure you want to withdraw your application for "${app.title}"?`]),
                            actions: () => {
                                const footerContainer = createElement("div", { class: "modal-actions-group" }) as HTMLElement;

                                const cancelBtn = Button({
                                    title: "Cancel",
                                    events: { click: () => modalInstance.close() },
                                    classes: "buttonx btn-secondary"
                                });

                                const confirmBtn = Button({
                                    title: "Yes, Withdraw",
                                    events: {
                                        click: async () => {
                                            try {
                                                await deleteApplication(app._id);
                                                Notify("Application withdrawn", { type: "success", duration: 3000 });
                                                modalInstance.close();
                                                baitoApplicantDash(container);
                                            } catch {
                                                Notify("Failed to withdraw", { type: "error", duration: 3000 });
                                                modalInstance.close();
                                            }
                                        }
                                    },
                                    classes: "buttonx btn-danger"
                                });

                                footerContainer.append(cancelBtn, confirmBtn);
                                return footerContainer;
                            }
                        });
                    }
                },
                classes: "buttonx btn-danger"
            }) as HTMLElement;

            card.append(createElement("div", { class: "action-row" }, [viewBtn, withdrawBtn]));
            list.appendChild(card);
        });
    }

    render(applications);

    // Filter events
    statusFilter.addEventListener("change", applyFilters);
    searchInput.addEventListener("input", applyFilters);

    function applyFilters(): void {
        const status = statusFilter.value;
        const search = searchInput.value.toLowerCase();
        const filtered = applications.filter(app =>
            (status ? app.status === status : true) &&
            (search ? (app.title || "").toLowerCase().includes(search) : true)
        );
        render(filtered);
    }
}

// ---------------- Employer Dashboard ----------------
function buildAdminCard(job: BaitoJob): HTMLElement {
    const card = createElement("div", { class: "baito-admin-card" }) as HTMLElement;
    card.append(
        createElement("h4", {}, [job.title || "Untitled"]),
        createElement("p", { class: "meta" }, [`📍 ${job.location || "Unknown"} • 💴 ¥${job.wage || "?"}/hr`]),
        createElement("p", {}, [`📝 Applications: ${job.applicationsCount || 0}`])
    );

    const viewBtn = Button({
        title: "👥 View Applicants",
        events: {
            click: () => showApplicantsModal(job)
        },
        classes: "buttonx btn-secondary"
    }) as HTMLElement;

    const copyLinkBtn = Button({
        title: "🔗 Copy Job Link",
        events: {
            click: () => {
                navigator.clipboard.writeText(`${window.location.origin}/baito/${job.baitoid}`);
                Notify("Job link copied!", { type: "success", duration: 3000 });
            }
        },
        classes: "buttonx btn-primary"
    }) as HTMLElement;

    card.append(createElement("div", { class: "action-row" }, [viewBtn, copyLinkBtn]));
    return card;
}

export async function baitoEmployerDash(container: HTMLElement): Promise<void> {
    container.replaceChildren();
    container.appendChild(createElement("h2", {}, ["🏢 Your Posted Baitos"]));

    let jobs: BaitoJob[] = [];
    try {
        jobs = (await getMine()) as BaitoJob[]; 
    } catch {
        container.appendChild(createElement("p", { class: "error" }, ["❌ Failed to load your baito listings."]));
        return;
    }

    if (!jobs.length) {
        container.appendChild(createElement("p", { class: "empty-state" }, ["You haven’t posted any baitos yet."]));
        return;
    }

    const list = createElement("div", { class: "baito-admin-list" }) as HTMLElement;
    jobs.forEach(job => list.appendChild(buildAdminCard(job)));
    container.appendChild(list);
}

// ---------------- Modal to show applicants ----------------
export async function showApplicantsModal(job: BaitoJob): Promise<void> {
    let applicants: Applicant[] = [];
    try {
        applicants = (await getApplicants(job.baitoid)) as Applicant[];
    } catch {
        Notify("Failed to fetch applicants", { type: "error", duration: 3000 });
        return;
    }

    const content = createElement("div", { class: "applicant-list" }) as HTMLElement;

    if (!applicants.length) {
        content.appendChild(createElement("p", {}, ["No applications yet."]));
    } else {
        applicants.forEach(app => {
                const row = createElement("div", { class: "app-card" }, [
                createElement("strong", {}, [app.username || "Applicant"]),
                createElement("p", {}, [app.pitch || "(No pitch)"]),
                createElement("p", { class: "muted" }, [`📅 ${formatRelativeTime(app.submittedAt ?? Date.now())}`])
            ]) as HTMLElement;

            row.addEventListener("click", () => {
                const applicantModal = Modal({
                    title: `Applicant: ${app.username || "Unknown"}`,
                    content: createElement("div", {}, [
                        createElement("p", {}, [`📩 ${app.pitch || "—"}`]),
                        createElement("p", {}, [`📅 Applied: ${Datex(app.submittedAt)}`])
                    ]),
                    actions: () => {
                        const footerContainer = createElement("div", {}) as HTMLElement;
                        footerContainer.appendChild(
                            Button({
                                title: "Close",
                                events: { click: () => applicantModal.close() },
                                classes: "buttonx btn-secondary"
                            })
                        );
                        return footerContainer;
                    }
                });
            });

            content.appendChild(row);
        });
    }

    const mainModal = Modal({
        title: `Applicants for "${job.title || "Job"}"`,
        content,
        actions: () => {
            const footerContainer = createElement("div", {}) as HTMLElement;
            footerContainer.appendChild(
                Button({
                    title: "Close",
                    events: { click: () => mainModal.close() },
                    classes: "buttonx btn-secondary"
                })
            );
            return footerContainer;
        }
    });
}

// ---------------- Main Dashboard Navigation ----------------
export function displayBaitoDash(isLoggedIn: boolean, container: HTMLElement): void {
    container.replaceChildren();
    container.appendChild(createElement("h2", {}, ["🏢 Baito Dashboard"]));

    if (!isLoggedIn) {
        container.appendChild(createElement("p", {}, ["🔒 Please log in to access your dashboard."]));
        return;
    }

    container.append(
        Button({
            title: "Employer Dashboard",
            id: "baito-dash-emp",
            events: { click: () => baitoEmployerDash(container) },
            classes: "buttonx"
        }),
        Button({
            title: "Applicant Dashboard",
            id: "baito-dash-apc",
            events: { click: () => baitoApplicantDash(container) },
            classes: "buttonx"
        })
    );
}