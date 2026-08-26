// displayArtists.ts

import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import Imagex from "../../components/base/Imagex.js";
import { navigate } from "../../routes/navigate.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { listArtists } from "./api.js";
import { adspace } from "../../services/ads/newads.js";
import { createMainLayout } from "../../components/layout/mainLayout.js";
import { createAsideContent } from "../../components/layout/asideLayout.js";

// ---------------------------------
// INTERFACES & TYPES
// ---------------------------------

export interface Artist {
    artistid?: string | number;
    name?: string;
    category?: string;
    bio?: string;
    photo?: string;
    [key: string]: any;
}

interface ArtistsApiResponse {
    data?: Artist[];
    artists?: Artist[];
    [key: string]: any;
}

export async function displayArtists(container: HTMLElement, isLoggedIn: boolean): Promise<void> {
    container.replaceChildren();

    const PAGE_NAME = "artists";

    // ---------- SIDEBAR ----------
    const asideContent = createAsideContent({
        title: "Actions",
        actions: isLoggedIn
            ? [Button("Create Artist", "", { click: () => navigate("/create-artist") }, "buttonx primary") as HTMLElement]
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
    }) as HTMLElement;

    // ---------- MAIN CONTENT ----------
    const searchInput = createElement("input", { type: "text", placeholder: "Search by name...", class: "sort-box" }) as HTMLInputElement;
    const categorySelect = createElement("select", { class: "sort-box" }, [
        createElement("option", { value: "" }, ["All Categories"])
    ]) as HTMLSelectElement;

    const filterContainer = createElement("div", { class: "top-controls" }, [searchInput, categorySelect]);
    const list = createElement("div", { class: "artists-list" }) as HTMLElement;

    const mainContent = [
        createElement("h1", {}, ["Artists"]),
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
        pageClass: "artists-page"
    }) as HTMLElement;
    container.append(layout);

    // ---------- FETCH ARTISTS ----------
    let allArtists: Artist[] = [];
    try {
        const resp = (await listArtists(0, 5000)) as ArtistsApiResponse | Artist[];
        if (Array.isArray(resp)) {
            allArtists = resp;
        } else {
            allArtists = resp?.data || resp?.artists || [];
        }
    } catch (err) {
        console.error("Failed to load artists", err);
    }

    // Populate categories
    const categories = [...new Set(allArtists.map(a => a.category).filter(Boolean))] as string[];
    categories.forEach(cat => categorySelect.append(createElement("option", { value: cat }, [cat])));

    let currentPage = 1;
    const pageSize = 10;

    function paginate(items: Artist[], page: number): Artist[] {
        const start = (page - 1) * pageSize;
        return items.slice(start, start + pageSize);
    }

    function renderArtists(filtered: Artist[]): void {
        list.replaceChildren();
        const paged = paginate(filtered, currentPage);

        if (!paged.length) {
            list.append(createElement("p", {}, ["No artists found."]));
            return;
        }

        paged.forEach((artist, idx) => {
            list.append(createArtistCard(artist));

            // Inject an in-list ad after every 5th artist card
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
            const pager = createElement("div", { class: "artists-pager" }) as HTMLElement;

            if (currentPage > 1) {
                pager.append(Button("Prev", "", {
                    click: () => {
                        currentPage--;
                        renderArtists(filtered);
                    }
                }, "buttonx secondary") as HTMLElement);
            }

            if (currentPage < totalPages) {
                pager.append(Button("Next", "", {
                    click: () => {
                        currentPage++;
                        renderArtists(filtered);
                    }
                }, "buttonx secondary") as HTMLElement);
            }

            list.append(pager);
        }
    }

    function applyFilters(): void {
        const keyword = searchInput.value.toLowerCase();
        const category = categorySelect.value;

        const filtered = allArtists.filter(a => {
            const matchesKeyword = a.name?.toLowerCase().includes(keyword) ?? false;
            const matchesCategory = !category || a.category === category;
            return matchesKeyword && matchesCategory;
        });

        currentPage = 1;
        renderArtists(filtered);
    }

    searchInput.addEventListener("input", applyFilters);
    categorySelect.addEventListener("change", applyFilters);

    // Initial render
    renderArtists(allArtists);
}

// ---------- ARTIST CARD ----------
function createArtistCard(artist: Artist): HTMLElement {
    const imgSrc = artist.photo
        ? resolveImagePath(EntityType.ARTIST, PictureType.THUMB, artist.photo)
        : "";

    const bioText = artist.bio || "";
    const truncatedBio = bioText.substring(0, 100) + (bioText.length > 100 ? "..." : "");

    return createElement("div", { class: "artist-card" }, [
        Imagex({ src: imgSrc, alt: artist.name || "Unnamed Artist", classes: "artist-thumb" }),
        createElement("h3", {}, [artist.name || "Unnamed"]),
        createElement("p", { class: "artist-category" }, [artist.category || "-"]),
        createElement("p", { class: "artist-bio" }, [truncatedBio]),
        Button("View Details", `view-${artist.artistid ?? ""}`, {
            click: () => {
                if (artist.artistid !== undefined && artist.artistid !== null) {
                    navigate(`/artist/${artist.artistid}`);
                }
            }
        }, "artist-view-btn")
    ]) as HTMLElement;
}