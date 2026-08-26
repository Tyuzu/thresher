// displayBaitos.ts

import { createElement } from "../../components/createElement";
import { Button } from "../../components/base/Button";
import { navigate } from "../../routes/navigate";
import { fetchLatestBaitos } from "./api.js";
import { adspace } from "../../services/ads/newads";
import { buildCard } from "./baitoslisting/JobCard";
import { createMainLayout } from "../../components/layout/mainLayout";
import { createAsideContent } from "../../components/layout/asideLayout";

// ---------------------------------
// INTERFACES & TYPES
// ---------------------------------

export interface Job {
    id?: string | number;
    title?: string;
    description?: string;
    [key: string]: any;
}

interface JobsApiResponse {
    data?: Job[];
    jobs?: Job[];
    [key: string]: any;
}

export async function displayBaitos(container: HTMLElement, isLoggedIn: boolean): Promise<void> {
    container.replaceChildren();

    const PAGE_NAME = "baitos";

    // ---------- SIDEBAR CONTENT ----------
    // Language selector
    const langSelect = createElement("select", { id: "lang-toggle" }) as HTMLSelectElement;
    ["EN", "JP"].forEach(lang =>
        langSelect.appendChild(createElement("option", { value: lang.toLowerCase() }, [lang]))
    );
    langSelect.value = localStorage.getItem("baito-lang") || "en";
    langSelect.addEventListener("change", (e: Event) => {
        const target = e.target as HTMLSelectElement;
        localStorage.setItem("baito-lang", target.value);
        navigate(window.location.pathname);
    });

    const asideContent = createAsideContent({
        title: "Actions",
        actions: isLoggedIn
            ? [
                Button({
                    title: "Create Baito",
                    id: "ct-baito-btn",
                    events: { click: () => navigate("/create-baito") },
                    classes: "buttonx"
                }),
                Button({
                    title: "See Dashboard",
                    id: "see-dash-btn",
                    events: { click: () => navigate("/baitos/dash") },
                    classes: "buttonx"
                }),
                Button({
                    title: "Create Baito Profile",
                    events: { click: () => navigate("/baitos/create-profile") },
                    classes: "buttonx secondary"
                }),
                Button({
                    title: "Hire Workers",
                    events: { click: () => navigate("/baitos/hire") },
                    classes: "buttonx secondary"
                })
            ]
            : [],
        children: [langSelect],
        showAd: true,
        page: PAGE_NAME,
        adPosition: "aside",
        adPlacement: "bottom",
        adOptions: {
            layout: "vertical",
            width: "100%",
            height: 320,
            refreshInterval: 30000
        }
    });

    // ---------- MAIN CONTENT ----------
    const searchInput = createElement("input", { type: "text", placeholder: "Search jobs...", class: "sort-box" }) as HTMLInputElement;
    const filterContainer = createElement("div", { class: "baitos-filters" }, [searchInput]);
    const list = createElement("div", { class: "baitos-list" }) as HTMLElement;

    const mainContent = [
        createElement("h1", {}, ["Baitos"]),
        filterContainer,
        adspace("inbody", PAGE_NAME, {
            layout: "horizontal",
            width: 728,
            height: 90,
            refreshInterval: 45000
        }),
        list
    ];

    // ---------- RENDER LAYOUT ----------
    const layout = createMainLayout({
        mainContent,
        asideContent,
        pageClass: "baitos-page"
    });
    container.append(layout);

    // ---------- FETCH JOBS ----------
    let allJobs: Job[] = [];
    try {
        const resp = await fetchLatestBaitos();
        if (Array.isArray(resp)) {
            allJobs = resp;
        } else if (resp && typeof resp === "object") {
            const apiData = resp as JobsApiResponse;
            allJobs = apiData.data || apiData.jobs || [];
        }
    } catch (err) {
        console.error("Failed to load baitos", err);
    }

    let currentPage = 1;
    const pageSize = 10;

    function paginate(items: Job[], page: number): Job[] {
        const start = (page - 1) * pageSize;
        return items.slice(start, start + pageSize);
    }

    function renderJobs(filtered: Job[]): void {
        list.replaceChildren();
        const paged = paginate(filtered, currentPage);

        if (!paged.length) {
            list.append(createElement("p", {}, ["No jobs found."]));
            return;
        }

        paged.forEach((job, idx) => {
            list.append(buildCard(job as any));

            // Inject an in-list native ad every 5 job items
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

        // Pagination
        const totalPages = Math.ceil(filtered.length / pageSize);
        if (totalPages > 1) {
            const pager = createElement("div", { class: "baitos-pager" });

            if (currentPage > 1) {
                pager.append(Button({
                    title: "Prev",
                    events: {
                        click: () => {
                            currentPage--;
                            renderJobs(filtered);
                        }
                    },
                    classes: "buttonx secondary"
                }));
            }

            if (currentPage < totalPages) {
                pager.append(Button({
                    title: "Next",
                    events: {
                        click: () => {
                            currentPage++;
                            renderJobs(filtered);
                        }
                    },
                    classes: "buttonx secondary"
                }));
            }

            list.append(pager);
        }
    }

    // ---------- FILTER LOGIC ----------
    function applyFilters(): void {
        const keyword = searchInput.value.toLowerCase();
        const filtered = allJobs.filter(job => (job.title || "").toLowerCase().includes(keyword));
        currentPage = 1;
        renderJobs(filtered);
    }

    searchInput.addEventListener("input", applyFilters);

    // Initial render
    renderJobs(allJobs);
}