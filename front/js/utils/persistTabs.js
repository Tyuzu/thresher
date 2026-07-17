// tabs.js
import { createElement } from "../components/createElement.js";
import { getRouteState, setRouteState } from "../state/state.js";
import { makeDraggableScroll } from "../components/dragnav.js";
import "../../css/ui/createTabs.css";

/**
 * High-order layout helper that handles persisting active tab views via localStorage.
 */
export function persistTabs(container, tabs, storageKey = null) {
    if (!container) return;
    try {
        const activeTabId = storageKey ? localStorage.getItem(storageKey) : null;
  
        const tabsElement = createTabs(tabs, null, activeTabId, (newTabId) => {
            if (storageKey) {
                localStorage.setItem(storageKey, newTabId);
            }
        });
  
        container.appendChild(tabsElement);
    } catch (err) {
        console.warn("Tabs component failed to initialize in container:", err);
    }
}

/**
 * Generates an accessible, performance-lazy rendering tab node interface.
 * 
 * @param {Array<{id: string, title: string, render: Function}>} tabs 
 * @param {string|null} routeKey - Option path tracking identifier mapped to global route history state.
 * @param {string|null} initialTabId - Direct fallback identifier to select a tab on mount.
 * @param {Function|null} onTabChange - Optional event callback: (tabId) => void
 */
export function createTabs(tabs, routeKey = null, initialTabId = null, onTabChange = null) {
    if (!Array.isArray(tabs) || tabs.length === 0) return createElement("div", { class: "tabs-empty" });

    // --- Build UI containers with strict Web ARIA compliance ---
    const tabContainer = createElement("div", { class: "tabs-container" });
    const tabButtons = createElement("div", { 
        class: "tab-buttons",
        role: "tablist",
        "aria-label": "Content Navigation Tabs"
    });
    const tabContents = createElement("div", { class: "tab-contents" });

    const tabContentMap = new Map();
    const buttonMap = new Map();

    // --- Instantiate Interactive Tab View Models ---
    tabs.forEach(({ id, title }) => {
        const panelId = `panel-${id}`;
        const buttonId = `tab-btn-${id}`;

        const contentContainer = createElement("article", {
            id: panelId,
            class: "tab-content",
            role: "tabpanel",
            "aria-labelledby": buttonId,
            tabindex: "0"
        });

        const tabButton = createElement("div", {
            id: buttonId,
            class: "tab-button",
            role: "tab",
            "aria-controls": panelId,
            "aria-selected": "false",
            tabindex: "0",
            dataset: { id: id },
            events: {
                click: () => activateTab(id),
                keydown: (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        activateTab(id);
                    }
                }
            }
        }, [title]);

        tabButtons.appendChild(tabButton);
        tabContents.appendChild(contentContainer);

        tabContentMap.set(id, contentContainer);
        buttonMap.set(id, tabButton);
    });

    // Attach horizontal swipe nav features if active
    if (typeof makeDraggableScroll === "function") {
        makeDraggableScroll(tabButtons);
    }
    
    tabContainer.appendChild(tabButtons);
    tabContainer.appendChild(tabContents);

    /**
     * Toggles layout active states and handles lazy evaluation injections
     */
    function activateTab(tabId) {
        tabs.forEach(({ id, render }) => {
            const btn = buttonMap.get(id);
            const content = tabContentMap.get(id);
            const isActive = id === tabId;

            if (btn && content) {
                btn.classList.toggle("active", isActive);
                btn.setAttribute("aria-selected", isActive ? "true" : "false");
                content.classList.toggle("active", isActive);

                // Lazy Rendering Verification Block
                if (isActive && !content.dataset.rendered) {
                    if (typeof render === "function") {
                        render(content);
                    }
                    content.dataset.rendered = "true";
                }
            }
        });

        // Router history persistence integration check
        if (routeKey) {
            const tabState = getRouteState(routeKey) || {};
            tabState.activeTab = tabId;
            setRouteState(routeKey, tabState);
        }

        if (typeof onTabChange === "function") {
            onTabChange(tabId);
        }
    }

    // --- State Resolution Loop ---
    let initial = initialTabId || tabs[0]?.id;

    if (routeKey) {
        const saved = getRouteState(routeKey);
        if (saved?.activeTab && tabContentMap.has(saved.activeTab)) {
            initial = saved.activeTab;
        }
    }

    // Defer initialization execute safely past the engine layout flush pass
    if (initial) {
        queueMicrotask(() => activateTab(initial));
    }

    return tabContainer;
}