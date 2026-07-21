import { createNavItem } from "../navigation.js";
import { makeDraggable } from "./fabHelpers/makeDraggable.js";

/** Default FAB Navigation Menu */
const defaultNavItems = [
    { href: "/home", label: "Home" },
    { href: "/events", label: "Events" },
    { href: "/places", label: "Places" },
    { href: "/feed", label: "Feed" },
    { href: "/forums", label: "Forums" },
    { href: "/livechat", label: "LiveChat" },
];

/** FAB Navigation Menu Generator */
const createFabNav = (actionContainer, navItems) => {
    const nav = document.createElement("nav");
    const ul = document.createElement("ul");
    ul.className = "hvflex";

    const fragment = document.createDocumentFragment();
    navItems.forEach((item) => fragment.appendChild(createNavItem(item.href, item.label)));

    ul.appendChild(fragment);
    nav.appendChild(ul);
    actionContainer.appendChild(nav);
};

/** Floating Action Button (FAB) */
const FloatingActionButton = (icon, id, navItems = defaultNavItems) => {
    if (document.getElementById(id)) {
        return;
    }

    const fabContainer = document.createElement("div");
    fabContainer.className = "fab-container";

    const fab = document.createElement("button");
    fab.id = id;
    fab.className = "fab";
    fab.innerHTML = icon;

    // Accessibility attributes
    fab.setAttribute("aria-label", "Floating Action Button Menu");
    fab.setAttribute("aria-expanded", "false");
    fab.setAttribute("aria-controls", `${id}-actions`);
    fab.setAttribute("role", "button");
    fab.setAttribute("tabindex", "0");

    const actionContainer = document.createElement("div");
    actionContainer.className = "fab-actions hidden";
    actionContainer.id = `${id}-actions`;

    // Generate Navigation for FAB
    createFabNav(actionContainer, navItems);

    // Coordinate state tracking to decouple dragging from firing a click
    let startX = 0;
    let startY = 0;
    const dragThresholdPx = 6; 

    const toggleFabMenu = () => {
        const isHidden = actionContainer.classList.toggle("hidden");
        fab.setAttribute("aria-expanded", (!isHidden).toString());
    };

    const closeFabMenu = () => {
        actionContainer.classList.add("hidden");
        fab.setAttribute("aria-expanded", "false");
    };

    // Tracks initial pointer registration points
    const handlePointerDown = (e) => {
        startX = e.clientX;
        startY = e.clientY;
    };

    // Compares click lifecycle distance to protect drag intent
    const handlePointerUp = (e) => {
        const deltaX = Math.abs(e.clientX - startX);
        const deltaY = Math.abs(e.clientY - startY);

        if (deltaX < dragThresholdPx && deltaY < dragThresholdPx) {
            e.stopPropagation();
            toggleFabMenu();
        }
    };

    fab.addEventListener("pointerdown", handlePointerDown);
    fab.addEventListener("pointerup", handlePointerUp);

    // Keyboard accessibility management
    fab.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleFabMenu();
        } else if (e.key === "Escape") {
            closeFabMenu();
        }
    });

    // Close menu when focus moves entirely out of the container
    fabContainer.addEventListener("focusout", (e) => {
        if (!fabContainer.contains(e.relatedTarget)) {
            closeFabMenu();
        }
    });

    // Close menu when clicking outside the boundary layout
    const handleOutsideClick = (e) => {
        if (!fabContainer.contains(e.target)) {
            closeFabMenu();
        }
    };

    document.addEventListener("click", handleOutsideClick);

    // Append elements using clean batch fragments
    const fragment = document.createDocumentFragment();
    fragment.appendChild(actionContainer);
    fragment.appendChild(fab);
    fabContainer.appendChild(fragment);
    
    const appContainer = document.getElementById("app");
    if (appContainer) {
        appContainer.appendChild(fabContainer);
    }

    // Initialize custom layout dragging mechanisms
    makeDraggable(fabContainer, id);

    // Return lifecycle destroy instance hook to eliminate global leaks
    const destroy = () => {
        document.removeEventListener("click", handleOutsideClick);
        fab.removeEventListener("pointerdown", handlePointerDown);
        fab.removeEventListener("pointerup", handlePointerUp);
        if (fabContainer.parentNode) {
            fabContainer.parentNode.removeChild(fabContainer);
        }
    };

    return {
        element: fabContainer,
        destroy: destroy
    };
};

export default FloatingActionButton;
export { FloatingActionButton };