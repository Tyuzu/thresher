import "../../../css/layout/navi.css";
import { navigate } from "../../routes/index.js";
import { getCurrentAllowedFeatures } from "../../config/domainFeatures.js";

/** Highlight current active link */
export const highlightActiveNav = (path) => {
    document.querySelectorAll(".navigation__link").forEach(link => {
        link.classList.toggle("active", link.getAttribute("href") === path);
    });
};

/** Handle navigation */
const handleNavigation = (event, href) => {
    event.preventDefault();
    if (!href) {
        return console.error("🚨 handleNavigation received null href!");
    }
    navigate(href);
};

/** Save nav order in localStorage */
const saveNavOrder = (order) => localStorage.setItem("navOrder", JSON.stringify(order));

/** Get nav order from localStorage */
const getNavOrder = () => {
    const stored = localStorage.getItem("navOrder");
    return stored ? JSON.parse(stored) : null;
};

/** Create one navigation item */
const createNavItem = (href, label) => {
    const li = document.createElement("li");
    li.className = "navigation__item";

    // Start as non-draggable so normal clicks fire cleanly
    li.setAttribute("draggable", "false");

    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.className = "navigation__link";
    anchor.textContent = label;
    anchor.addEventListener("click", (e) => handleNavigation(e, href));

    li.appendChild(anchor);
    return li;
};

/** Enable drag & drop only when toggle is checked */
const enableDragDrop = (ul, toggle) => {
    let draggingEl = null;
    const placeholder = document.createElement("li");
    placeholder.className = "navigation__placeholder";

    const updateDraggableState = () => {
        const isEditable = toggle.checked;
        ul.querySelectorAll(".navigation__item").forEach(item => {
            item.setAttribute("draggable", isEditable ? "true" : "false");
        });
    };

    toggle.addEventListener("change", updateDraggableState);

    const onDragStart = (e) => {
        if (!toggle.checked) return;
        draggingEl = e.target.closest("li");
        draggingEl.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
    };

    const onDragEnd = () => {
        if (draggingEl) {
            draggingEl.classList.remove("dragging");
        }
        draggingEl = null;
        placeholder.remove();

        // Save order
        const order = Array.from(ul.children)
            .filter(el => el !== placeholder)
            .map(el => el.querySelector("a").getAttribute("href"));
        saveNavOrder(order);
    };

    const onDragOver = (e) => {
        if (!toggle.checked) return;
        e.preventDefault();

        const target = e.target.closest("li");
        if (!target || target === draggingEl || target === placeholder) return;

        const rect = target.getBoundingClientRect();
        const next = (e.clientX - rect.left) / rect.width > 0.5;
        ul.insertBefore(placeholder, next ? target.nextSibling : target);
    };

    const onDrop = (e) => {
        e.preventDefault();
        if (!toggle.checked) return;
        if (placeholder.parentNode) {
            ul.insertBefore(draggingEl, placeholder);
        }
        placeholder.remove();
    };

    ul.addEventListener("dragstart", onDragStart);
    ul.addEventListener("dragend", onDragEnd);
    ul.addEventListener("dragover", onDragOver);
    ul.addEventListener("drop", onDrop);
};

/** Filter nav items according to the active domain's feature flags */
const getPermittedNavItems = (allNavItems) => {
    const allowed = getCurrentAllowedFeatures();

    // If domain allows ALL features, return everything
    if (allowed.includes("ALL")) {
        return allNavItems;
    }

    return allNavItems.filter(item => {
        // Shared core items without a feature key are always shown
        if (!item.feature) return true;
        return allowed.includes(item.feature);
    });
};

/** Create navigation bar */
const createNav = () => {
    // 1. Master list of navigation items mapped to feature keys
    const allNavItems = [
        { href: "/farms", label: "Farms", feature: "farms" },
        { href: "/grocery", label: "Grocery", feature: "farms" },
        { href: "/recipes", label: "Recipes", feature: "farms" },
        { href: "/deliveries", label: "Deliveries", feature: "farms" },
        { href: "/places", label: "Places", feature: "places" },
        { href: "/events", label: "Events", feature: "events" },
        { href: "/artists", label: "Artists", feature: "events" },
        { href: "/posts", label: "Posts", feature: "social" },
        { href: "/baitos", label: "Baito", feature: "baito" },
        { href: "/baitos/hire", label: "Hire", feature: "baito" },
    ];

    // 2. Filter available items based on domain permissions
    const defaultNavItems = getPermittedNavItems(allNavItems);

    // 3. Apply custom drag-and-drop ordering (stored in localStorage)
    const savedOrder = getNavOrder();
    let navItems = defaultNavItems;

    if (savedOrder) {
        navItems = savedOrder
            .map(href => defaultNavItems.find(item => item.href === href))
            .filter(Boolean);

        defaultNavItems.forEach(item => {
            if (!navItems.find(i => i.href === item.href)) {
                navItems.push(item);
            }
        });
    }

    const nav = document.createElement("div");
    nav.className = "navigation";

    const toggle = document.createElement("input");
    toggle.className = "toggle";
    toggle.type = "checkbox";
    toggle.id = "more";
    toggle.setAttribute("tabindex", "-1");

    const inner = document.createElement("div");
    inner.className = "navigation__inner";

    const ul = document.createElement("ul");
    ul.className = "navigation__list horizontal";

    navItems.forEach(({ href, label }) => ul.appendChild(createNavItem(href, label)));

    enableDragDrop(ul, toggle);

    const toggleLabelWrapper = document.createElement("div");
    toggleLabelWrapper.className = "navigation__toggle";

    const toggleLabel = document.createElement("label");
    toggleLabel.className = "navigation__link";
    toggleLabel.setAttribute("for", "more");
    toggleLabel.innerText = "More";

    toggleLabelWrapper.appendChild(toggleLabel);
    inner.appendChild(ul);
    inner.appendChild(toggleLabelWrapper);
    nav.appendChild(toggle);
    nav.appendChild(inner);

    highlightActiveNav(window.location.pathname);

    return nav;
};

export { createNav, createNavItem };


// anchor.addEventListener("mouseenter", () => {
//     // Finds the route definition in staticRoutes and triggers moduleImport() early
//     const route = staticRoutes[href];
//     if (route && route.moduleImport) {
//         route.moduleImport(); // Browser fetches and caches the chunk in background
//     }
// }, { once: true });
