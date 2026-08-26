// displayHireWorkers.ts

import { createElement } from "../../../components/createElement";
import { Button } from "../../../components/base/Button";
import { navigate } from "../../../routes/navigate";
import { renderWorkerList } from "./WorkerList";
import { listWorkers } from "../api.js";
import { adspace } from "../../../services/ads/newads";
import { createMainLayout } from "../../../components/layout/mainLayout";
import { createAsideContent } from "../../../components/layout/asideLayout";
import { Worker } from "./WorkerModal";

// ---------------------------------
// INTERFACES & TYPES
// ---------------------------------

interface WorkersApiResponse {
    data?: Worker[];
    workers?: Worker[];
    [key: string]: any;
}

export async function displayHireWorkers(
    isLoggedIn: boolean,
    container: HTMLElement
): Promise<void> {
    container.replaceChildren();

    const PAGE_NAME = "hire-workers";

    // ---------- SIDEBAR ----------
    const asideContent = createAsideContent({
        title: "Actions",
        actions: isLoggedIn
            ? [Button("Create Worker Profile", "", { click: () => navigate("/baitos/create-profile") }, "buttonx")]
            : [],
        showAd: true,
        page: PAGE_NAME,
        adPosition: "aside",
        adPlacement: "bottom",
        adOptions: {
            layout: "vertical",
            width: 300,
            height: 250,
            refreshInterval: 30000
        }
    });

    // ---------- MAIN CONTENT CONTROLS ----------
    const searchInput = createElement("input", {
        type: "search",
        placeholder: "Search by name, skills, or roles...",
        class: "sort-box",
        "aria-label": "Search by name, skills, or roles"
    }) as HTMLInputElement;

    let isGridView = localStorage.getItem("workerView") !== "list";
    const toggleViewBtn = Button(
        isGridView ? "📋 List View" : "🎛️ Grid View",
        "layout-toggle-btn",
        {
            click: () => {
                isGridView = !isGridView;
                localStorage.setItem("workerView", isGridView ? "grid" : "list");
                toggleViewBtn.textContent = isGridView ? "📋 List View" : "🎛️ Grid View";
                renderWorkers(getFilteredWorkers());
            }
        },
        "buttonx secondary"
    ) as HTMLElement;

    const filterContainer = createElement(
        "section",
        { class: "workers-filters", "aria-label": "Search and view options" },
        [searchInput, toggleViewBtn]
    ) as HTMLElement;

    const list = createElement("section", {
        class: "workers-list",
        "aria-label": "Workers list"
    }) as HTMLElement;

    // ---------- MAIN CONTENT ARRAY ----------
    const mainContent = [
        createElement("h1", {}, ["Find Skilled Workers"]),
        filterContainer,
        adspace("inbody", PAGE_NAME, {
            layout: "horizontal",
            width: 728,
            height: 90,
            refreshInterval: 45000
        }),
        list
    ];

    // ---------- LAYOUT ----------
    const layout = createMainLayout({
        mainContent,
        asideContent,
        pageClass: "workers-page"
    });
    container.append(layout);

    // ---------- FETCH WORKERS ----------
    let allWorkers: Worker[] = [];
    try {
        const resp = (await listWorkers(1, 5000)) as Worker[] | WorkersApiResponse;
        allWorkers = Array.isArray(resp) ? resp : resp?.data || resp?.workers || [];
    } catch (err) {
        console.error("Failed to load workers", err);
    }

    let currentPage = 1;
    const pageSize = 10;

    function paginate(items: Worker[], page: number): Worker[] {
        const start = (page - 1) * pageSize;
        return items.slice(start, start + pageSize);
    }

    function renderWorkers(filtered: Worker[]): void {
        list.replaceChildren();
        const paged = paginate(filtered, currentPage);

        if (!paged.length) {
            list.append(createElement("p", { class: "no-results", role: "status" }, ["No workers found."]));
            return;
        }

        renderWorkerList(list, paged, isGridView, isLoggedIn);

        // Inject in-list ad after every 5th worker item
        paged.forEach((_, idx) => {
            if ((idx + 1) % 5 === 0) {
                list.append(
                    adspace("inlist", PAGE_NAME, {
                        layout: "vertical",
                        width: "100%",
                        height: 120
                    })
                );
            }
        });

        const totalPages = Math.ceil(filtered.length / pageSize);
        if (totalPages > 1) {
            const pager = createElement("nav", {
                class: "workers-pager",
                "aria-label": "Pagination"
            }) as HTMLElement;

            if (currentPage > 1) {
                pager.append(Button("Prev", "", {
                    click: () => {
                        currentPage--;
                        renderWorkers(filtered);
                    }
                }, "buttonx secondary"));
            }

            if (currentPage < totalPages) {
                pager.append(Button("Next", "", {
                    click: () => {
                        currentPage++;
                        renderWorkers(filtered);
                    }
                }, "buttonx secondary"));
            }

            list.append(pager);
        }
    }

    function getFilteredWorkers(): Worker[] {
        const keyword = searchInput.value.toLowerCase().trim();
        if (!keyword) {
            return allWorkers;
        }

        return allWorkers.filter(w => {
            const nameMatch = w.name?.toLowerCase().includes(keyword);

            const skillsArray = Array.isArray(w.skills) ? w.skills : typeof w.skills === "string" ? [w.skills] : [];
            const skillsMatch = skillsArray.join(" ").toLowerCase().includes(keyword);

            const preferredRolesArray = Array.isArray(w.preferredRoles) ? w.preferredRoles : typeof w.preferredRoles === "string" ? [w.preferredRoles] : [];
            const rolesMatch = preferredRolesArray.join(" ").toLowerCase().includes(keyword);
            const profMatch = w.profession?.toLowerCase().includes(keyword);

            return Boolean(nameMatch || skillsMatch || rolesMatch || profMatch);
        });
    }

    function applyFilters(): void {
        currentPage = 1;
        renderWorkers(getFilteredWorkers());
    }

    searchInput.addEventListener("input", applyFilters);

    // Initial render
    renderWorkers(allWorkers);
}