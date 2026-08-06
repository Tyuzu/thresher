import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import { navigate } from "../../routes/index.js";
import { apiFetch } from "../../api/api.js";
import { adspace } from "../../services/ads/newads.js";
import { buildCard } from "./baitoslisting/JobCard.js";
import { createMainLayout } from "../../components/layout/mainLayout.js";
import { createAsideContent } from "../../components/layout/asideLayout.js";

export async function displayBaitos(container, isLoggedIn) {
  container.replaceChildren();

  // ---------- SIDEBAR CONTENT ----------
  const asideChildren = [];

  if (isLoggedIn) {
    asideChildren.push(
      Button("Create Baito", "ct-baito-btn", { click: () => navigate("/create-baito") }, "buttonx"),
      Button("See Dashboard", "see-dash-btn", { click: () => navigate("/baitos/dash") }, "buttonx"),
      Button("Create Baito Profile", "", { click: () => navigate("/baitos/create-profile") }, "buttonx secondary"),
      Button("Hire Workers", "", { click: () => navigate("/baitos/hire") }, "buttonx secondary")
    );
  }

  // Language selector
  const langSelect = createElement("select", { id: "lang-toggle" });
  ["EN", "JP"].forEach(lang =>
    langSelect.appendChild(createElement("option", { value: lang.toLowerCase() }, [lang]))
  );
  langSelect.value = localStorage.getItem("baito-lang") || "en";
  langSelect.addEventListener("change", e => {
    localStorage.setItem("baito-lang", e.target.value);
    navigate(window.location.pathname);
  });
  asideChildren.push(langSelect);

  const asideContent = createAsideContent({
    title: "Actions",
    children: asideChildren,
    showAd: true
  });

  // ---------- MAIN CONTENT ----------
  const mainContent = [];

  // Title
  mainContent.push(createElement("h1", {}, ["Baitos"]));

  // Filters
  const filterContainer = createElement("div", { class: "baitos-filters" });
  const searchInput = createElement("input", { type: "text", placeholder: "Search jobs...", class: "sort-box" });
  filterContainer.append(searchInput);
  mainContent.push(filterContainer);

  mainContent.push(adspace("inbody"));

  // List
  const list = createElement("div", { class: "baitos-list" });
  mainContent.push(list);

  // ---------- RENDER LAYOUT ----------
  const layout = createMainLayout({
    mainContent,
    asideContent,
    pageClass: "baitos-page"
  });
  container.append(layout);

  // ---------- FETCH JOBS ----------
  let allJobs = [];
  try {
    const resp = await apiFetch("/baitos/latest");
    allJobs = Array.isArray(resp) ? resp : resp?.data || resp?.jobs || [];
  } catch (err) {
    console.error("Failed to load baitos", err);
  }

  let currentPage = 1;
  const pageSize = 10;

  function paginate(items, page) {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }

  function renderJobs(filtered) {
    list.replaceChildren();
    const paged = paginate(filtered, currentPage);

    if (!paged.length) {
      list.append(createElement("p", {}, ["No jobs found."]));
      return;
    }

    paged.forEach((job, idx) => {
      list.append(buildCard(job));
      if ((idx + 1) % 6 === 0) {
        list.append(adspace("inlist"));
      }
    });

    // Pagination
    const totalPages = Math.ceil(filtered.length / pageSize);
    if (totalPages > 1) {
      const pager = createElement("div", { class: "baitos-pager" });

      if (currentPage > 1) {
        pager.append(Button("Prev", "", {
          click: () => {
            currentPage--;
            renderJobs(filtered);
          }
        }, "buttonx secondary"));
      }

      if (currentPage < totalPages) {
        pager.append(Button("Next", "", {
          click: () => {
            currentPage++;
            renderJobs(filtered);
          }
        }, "buttonx secondary"));
      }

      list.append(pager);
    }
  }

  // ---------- FILTER LOGIC ----------
  function applyFilters() {
    const keyword = searchInput.value.toLowerCase();
    const filtered = allJobs.filter(job => (job.title || "").toLowerCase().includes(keyword));
    currentPage = 1;
    renderJobs(filtered);
  }

  searchInput.addEventListener("input", applyFilters);

  // Initial render
  renderJobs(allJobs);
}