import "../../../css/layout/sticky5.css";
import { createElement } from "../createElement.ts";
import { notifSVG, cartSVG, chatSVG, menuSVG } from "../svgs.ts";
import { navigate } from "../../routes/navigate.ts";
import { getState, subscribe } from "../../state/state.ts";
import { openNotificationsModal } from "../../services/notifications/notifModal.ts";
import { toggleSidebar } from "./sidebar.ts";
import { createIconButton } from "../../utils/svgIconButton.ts";

/* =========================================================
   BADGE HELPER
========================================================= */

function createBadge(count) {
    const displayCount = count > 99 ? "99+" : String(count);

    return createElement(
        "span",
        {
            class: "nav-badge",
            "aria-label": `${count} unread`
        },
        [displayCount]
    );
}

/* =========================================================
   NAV UPDATE LOGIC
========================================================= */

function updateNav(container, extraOptions = {}) {
    const isLoggedIn = !!getState("user") || !!getState("token");
    const unreadMessages = getState("unreadMessages") || 0;
    const unreadNotifications = getState("unreadNotifications") || 0;

    // Custom image/profile element passed from caller
    const imglink = extraOptions?.imglink || null;

    // State key snapshot to prevent redundant DOM re-renders
    const nextStateKey = `${isLoggedIn}-${unreadMessages}-${unreadNotifications}-${!!imglink}`;
    if (container.dataset.stateKey === nextStateKey) {
        return;
    }
    container.dataset.stateKey = nextStateKey;

    const fragment = document.createDocumentFragment();

    // 1. Sidebar Toggle Button
    fragment.appendChild(
        createIconButton({
            classSuffix: "menu",
            svgMarkup: menuSVG,
            onClick: toggleSidebar,
            label: "Open menu"
        })
    );

    // // 2. Profile / Custom Image Link Position
    // if (imglink) {
    //     if (imglink instanceof Node) {
    //         fragment.appendChild(imglink);
    //     } else if (typeof imglink === "function") {
    //         fragment.appendChild(imglink());
    //     }
    // }

    // 3. Authenticated Navigation Action Buttons
    if (isLoggedIn) {
        // Chat / Messages Button
        const chatBtn = createIconButton({
            classSuffix: "stickychat",
            svgMarkup: chatSVG,
            onClick: () => navigate("/newchats"),
            label: "Chats"
        });

        if (unreadMessages > 0) {
            chatBtn.appendChild(createBadge(unreadMessages));
        }
        fragment.appendChild(chatBtn);

        // Shopping Cart Button
        fragment.appendChild(
            createIconButton({
                classSuffix: "cart",
                svgMarkup: cartSVG,
                onClick: () => navigate("/cart"),
                label: "Shopping cart"
            })
        );

        // Notifications Button
        const notifBtn = createIconButton({
            classSuffix: "notif",
            svgMarkup: notifSVG,
            onClick: openNotificationsModal,
            label: "Notifications"
        });

        if (unreadNotifications > 0) {
            notifBtn.appendChild(createBadge(unreadNotifications));
        }
        fragment.appendChild(notifBtn);
    }

    // Single DOM update operation
    container.replaceChildren(fragment);
}

/* =========================================================
   STICKY COMPONENT
========================================================= */

export function Sticky(divs = {}) {
    const container = createElement("div", {
        class: "plypzstp"
    });

    // Initial render
    updateNav(container, divs);

    let renderAnimationFrame = null;

    const scheduleUpdate = () => {
        if (renderAnimationFrame) {
            cancelAnimationFrame(renderAnimationFrame);
        }
        renderAnimationFrame = requestAnimationFrame(() => {
            updateNav(container, divs);
        });
    };

    // Subscriptions
    const unsubToken = subscribe("token", scheduleUpdate);
    const unsubUser = subscribe("user", scheduleUpdate);
    const unsubMessages = subscribe("unreadMessages", scheduleUpdate);
    const unsubNotifications = subscribe("unreadNotifications", scheduleUpdate);

    // MutationObserver cleanup strategy from the old implementation
    const observer = new MutationObserver(() => {
        Promise.resolve().then(() => {
            if (!document.body.contains(container)) {
                if (renderAnimationFrame) {
                    cancelAnimationFrame(renderAnimationFrame);
                }
                unsubToken?.();
                unsubUser?.();
                unsubMessages?.();
                unsubNotifications?.();
                observer.disconnect();
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    return container;
}

export { Sticky as sticky };