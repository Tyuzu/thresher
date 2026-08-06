import { createElement } from "../../../components/createElement.js";
import { Button } from "../../../components/base/Button.js";
import { navigate } from "../../../routes/index.js";
import { renderWorkerList } from "./WorkerList.js";
import { apiFetch } from "../../../api/api.js";
import { adspace } from "../../../services/ads/newads.js";
import { createMainLayout } from "../../../components/layout/mainLayout.js";
import { createAsideContent } from "../../../components/layout/asideLayout.js";

export async function displayHireWorkers(isLoggedIn, container) {
  container.replaceChildren();

  const PAGE_NAME = "hire-workers";

  // ---------- SIDEBAR ----------
  const asideChildren = [];
  if (isLoggedIn) {
    asideChildren.push(
      Button("Create Worker Profile", "", { click: () => navigate("/baitos/create-profile") }, "buttonx")
    );
  }

  // Sidebar Ad: 300x250 Medium Rectangle with 30s auto-refresh
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
    showAd: false // Handled directly via asideChildren to avoid duplicate slots
  });

  // ---------- MAIN CONTENT ----------
  const mainContent = [];

  // Title
  mainContent.push(createElement("h1", {}, ["Find Skilled Workers"]));

  // Filters & View Toggle
  const filterContainer = createElement("section", {
    class: "workers-filters",
    "aria-label": "Search and view options"
  });

  const searchInput = createElement("input", {
    type: "search",
    placeholder: "Search by name, skills, or roles...",
    class: "sort-box",
    "aria-label": "Search by name, skills, or roles"
  });

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
  );

  filterContainer.append(searchInput, toggleViewBtn);
  mainContent.push(filterContainer);

  // In-body Leaderboard Ad (728x90) below filters with 45s auto-refresh
  mainContent.push(
    adspace("inbody", PAGE_NAME, {
      width: 728,
      height: 90,
      refreshInterval: 45000
    })
  );

  // List Section
  const list = createElement("section", {
    class: "workers-list",
    "aria-label": "Workers list"
  });
  mainContent.push(list);

  // ---------- LAYOUT ----------
  const layout = createMainLayout({
    mainContent,
    asideContent,
    pageClass: "workers-page"
  });
  container.append(layout);

  // ---------- FETCH WORKERS ----------
  let allWorkers = [];
  try {
    const resp = await apiFetch("/baitos/workers?page=1&limit=5000");
    allWorkers = Array.isArray(resp) ? resp : resp?.data || resp?.workers || [];
  } catch (err) {
    console.error("Failed to load workers", err);
  }

  let currentPage = 1;
  const pageSize = 10;

  function paginate(items, page) {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }

  function renderWorkers(filtered) {
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
      });

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

  function getFilteredWorkers() {
    const keyword = searchInput.value.toLowerCase().trim();
    if (!keyword) return allWorkers;

    return allWorkers.filter(w => {
      const nameMatch = w.name?.toLowerCase().includes(keyword);

      const skillsArray = Array.isArray(w.skills) ? w.skills : typeof w.skills === "string" ? [w.skills] : [];
      const skillsMatch = skillsArray.join(" ").toLowerCase().includes(keyword);

      const preferredRolesArray = Array.isArray(w.preferredRoles) ? w.preferredRoles : typeof w.preferredRoles === "string" ? [w.preferredRoles] : [];
      const rolesMatch = preferredRolesArray.join(" ").toLowerCase().includes(keyword);
      const profMatch = w.profession?.toLowerCase().includes(keyword);

      return nameMatch || skillsMatch || rolesMatch || profMatch;
    });
  }

  function applyFilters() {
    currentPage = 1;
    renderWorkers(getFilteredWorkers());
  }

  searchInput.addEventListener("input", applyFilters);

  // Initial render
  renderWorkers(allWorkers);
}