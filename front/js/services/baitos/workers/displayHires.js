import { createElement } from "../../../components/createElement.js";
import { Button } from "../../../components/base/Button.js";
import { navigate } from "../../../routes/index.js";
import { renderWorkerList } from "./WorkerList.js";
import { apiFetch } from "../../../api/api.js";
import { adspace } from "../../home/homeHelpers.js";

export async function displayHireWorkers(isLoggedIn, container) {
  container.replaceChildren();

  // ---------- LAYOUT ----------
  const layout = createElement("div", { class: "workers-page" });
  const aside = createElement("aside", { class: "workers-aside" });
  const main = createElement("div", { class: "workers-main" });
  layout.append(main, aside);
  container.append(layout);

  // ---------- SIDEBAR ----------
  aside.append(createElement("h2", {}, ["Actions"]));
  if (isLoggedIn) {
    aside.append(
      Button("Create Worker Profile", "", { click: () => navigate("/baitos/create-profile") }, "buttonx")
    );
  }
  aside.append(adspace("aside"));

  // ---------- TITLE ----------
  main.append(createElement("h1", {}, ["Find Skilled Workers"]));

  // ---------- FILTERS & VIEW TOGGLE ----------
  const filterContainer = createElement("div", { class: "workers-filters" });
  const searchInput = createElement("input", { 
    type: "text", 
    placeholder: "Search by name, skills, or roles...", 
    class: "sort-box" 
  });
  
  // Create active layout toggle
  let isGridView = localStorage.getItem("workerView") !== "list";
  const toggleViewBtn = Button(
    isGridView ? "📋 List View" : "grid_view Grid View", 
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
  main.append(filterContainer);

  // ---------- BODY AD ----------
  main.append(adspace("inbody"));

  // ---------- FETCH WORKERS ----------
  let allWorkers = [];
  try {
    const resp = await apiFetch("/baitos/workers?page=1&limit=5000");
    allWorkers = Array.isArray(resp) ? resp : resp?.data || resp?.workers || [];
  } catch (err) {
    console.error("Failed to load workers", err);
  }

  // ---------- LIST ----------
  const list = createElement("div", { class: "workers-list" });
  main.append(list);

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
      list.append(createElement("p", { class: "no-results" }, ["No workers found."]));
      return;
    }

    renderWorkerList(list, paged, isGridView, isLoggedIn);

    // ---------- ADS ----------
    paged.forEach((_, idx) => {
      if ((idx + 1) % 6 === 0) {
        list.append(adspace("inlist"));
      }
    });

    // ---------- PAGINATION ----------
    const totalPages = Math.ceil(filtered.length / pageSize);
    if (totalPages > 1) {
      const pager = createElement("div", { class: "workers-pager" });

      if (currentPage > 1) {
        pager.append(Button("Prev", "", { click: () => {
          currentPage--; renderWorkers(filtered); 
        } }, "buttonx secondary"));
      }

      if (currentPage < totalPages) {
        pager.append(Button("Next", "", { click: () => {
          currentPage++; renderWorkers(filtered); 
        } }, "buttonx secondary"));
      }

      list.append(pager);
    }
  }

  // Helper to extract filtered subset safely
  function getFilteredWorkers() {
    const keyword = searchInput.value.toLowerCase().trim();
    if (!keyword) return allWorkers;

    return allWorkers.filter(w => {
      const nameMatch = w.name?.toLowerCase().includes(keyword);
      
      // Safe skills formatting check
      const skillsArray = Array.isArray(w.skills) ? w.skills : typeof w.skills === 'string' ? [w.skills] : [];
      const skillsMatch = skillsArray.join(" ").toLowerCase().includes(keyword);
      
      // Fallback check against roles (profession)
      const preferredRolesArray = Array.isArray(w.preferredRoles) ? w.preferredRoles : typeof w.preferredRoles === 'string' ? [w.preferredRoles] : [];
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