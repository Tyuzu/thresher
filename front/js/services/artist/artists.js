import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import Imagex from "../../components/base/Imagex.js";
import { navigate } from "../../routes/index.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { apiFetch } from "../../api/api.js";
import { adspace } from "../../services/ads/newads.js";
import { createMainLayout } from "../../components/layout/mainLayout.js";
import { createAsideContent } from "../../components/layout/asideLayout.js";

export async function displayArtists(container, isLoggedIn) {
  container.replaceChildren();

  const PAGE_NAME = "artists";

  // ---------- SIDEBAR ----------
  const asideChildren = [];
  if (isLoggedIn) {
    asideChildren.push(
      Button("Create Artist", "", { click: () => navigate("/create-artist") }, "buttonx primary")
    );
  }

  // Sidebar Ad: 300x250 medium rectangle with auto-refresh every 30 seconds
  asideChildren.push(
    adspace("aside", PAGE_NAME, {
      width: 300,
      height: 250,
      refreshInterval: 30000
    })
  );

  const asideContent = createAsideContent({
    title: "Actions",
    children: asideChildren,
    showAd: false // Handled directly above
  });

  // ---------- MAIN CONTENT ----------
  const mainContent = [];

  // Title
  mainContent.push(createElement("h1", {}, ["Artists"]));

  // Filters
  const filterContainer = createElement("div", { class: "top-controls" });
  const searchInput = createElement("input", { type: "text", placeholder: "Search by name...", class: "sort-box" });
  const categorySelect = createElement("select", { class: "sort-box" }, [
    createElement("option", { value: "" }, ["All Categories"])
  ]);
  filterContainer.append(searchInput, categorySelect);
  mainContent.push(filterContainer);

  // In-body Leaderboard Ad (728x90) below filters
  mainContent.push(
    adspace("inbody", PAGE_NAME, {
      width: 728,
      height: 90,
      refreshInterval: 45000
    })
  );

  // List
  const list = createElement("div", { class: "artists-list" });
  mainContent.push(list);

  // ---------- LAYOUT ----------
  const layout = createMainLayout({
    mainContent,
    asideContent,
    pageClass: "artists-page"
  });
  container.append(layout);

  // ---------- FETCH ARTISTS ----------
  let allArtists = [];
  try {
    const resp = await apiFetch("/artists?offset=0&limit=5000");
    allArtists = Array.isArray(resp) ? resp : resp?.data || resp?.artists || [];
  } catch (err) {
    console.error("Failed to load artists", err);
  }

  // Populate categories
  const categories = [...new Set(allArtists.map(a => a.category).filter(Boolean))];
  categories.forEach(cat => categorySelect.append(createElement("option", { value: cat }, [cat])));

  let currentPage = 1;
  const pageSize = 10;

  function paginate(items, page) {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }

  function renderArtists(filtered) {
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
            width: "100%",
            height: 120
          })
        );
      }
    });

    const totalPages = Math.ceil(filtered.length / pageSize);
    if (totalPages > 1) {
      const pager = createElement("div", { class: "artists-pager" });

      if (currentPage > 1) {
        pager.append(Button("Prev", "", {
          click: () => {
            currentPage--;
            renderArtists(filtered);
          }
        }, "buttonx secondary"));
      }

      if (currentPage < totalPages) {
        pager.append(Button("Next", "", {
          click: () => {
            currentPage++;
            renderArtists(filtered);
          }
        }, "buttonx secondary"));
      }

      list.append(pager);
    }
  }

  function applyFilters() {
    const keyword = searchInput.value.toLowerCase();
    const category = categorySelect.value;

    const filtered = allArtists.filter(a => {
      const matchesKeyword = a.name?.toLowerCase().includes(keyword);
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
function createArtistCard(artist) {
  const imgSrc = artist.photo
    ? resolveImagePath(EntityType.ARTIST, PictureType.THUMB, artist.photo)
    : "";

  return createElement("div", { class: "artist-card" }, [
    Imagex({ src: imgSrc, alt: artist.name || "Unnamed Artist", classes: "artist-thumb" }),
    createElement("h3", {}, [artist.name || "Unnamed"]),
    createElement("p", { class: "artist-category" }, [artist.category || "-"]),
    createElement("p", { class: "artist-bio" }, [
      ((artist.bio || "") + "").substring(0, 100) + ((artist.bio || "").length > 100 ? "..." : "")
    ]),
    Button("View Details", `view-${artist.artistid}`, {
      click: () => navigate(`/artist/${artist.artistid}`)
    }, "artist-view-btn")
  ]);
}