import "../../../css/layout/sticky.css";
import { createElement } from "../createElement.js";
import { notifSVG, cartSVG, chatSVG, menuSVG } from "../svgs/featherSVGs";
import { navigate } from "../../routes/navigate.js";
import { getState, subscribe } from "../../state/state.js";
import { openNotificationsModal } from "../../services/notifications/notifModal.js";
import { toggleSidebar } from "./sidebar.js";
import { createIconButton } from "../../utils/svgIconButton.js";

/* =========================================================
   TYPES & INTERFACES
========================================================= */

export type ImgLinkOption = Node | (() => Node) | null;

export interface StickyExtraOptions {
    imglink?: ImgLinkOption;
}

type UnsubscribeFn = () => void;

/* =========================================================
   BADGE HELPER
========================================================= */

function createBadge(count: number): HTMLElement {
    const displayCount: string = count > 99 ? "99+" : String(count);

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

function updateNav(container: HTMLElement, extraOptions: StickyExtraOptions = {}): void {
    const isLoggedIn: boolean = !!getState("user") || !!getState("token");
    const unreadMessages: number = (getState("unreadMessages") as number) || 0;
    const unreadNotifications: number = (getState("unreadNotifications") as number) || 0;

    // Custom image/profile element passed from caller
    const imglink: ImgLinkOption = extraOptions?.imglink || null;
    // State key snapshot to prevent redundant DOM re-renders
    const nextStateKey = `${isLoggedIn}-${unreadMessages}-${unreadNotifications}-${!!imglink}`;

    // Use bracket notation here 👇
    if (container.dataset['stateKey'] === nextStateKey) {
        return;
    }

    // And here 👇
    container.dataset['stateKey'] = nextStateKey;
    const fragment: DocumentFragment = document.createDocumentFragment();

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
        const chatBtn: HTMLElement = createIconButton({
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
        const notifBtn: HTMLElement = createIconButton({
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

export function Sticky(divs: StickyExtraOptions = {}): HTMLDivElement {
    const container = createElement("div", {
        class: "plypzstp"
    }) as HTMLDivElement;

    // Initial render
    updateNav(container, divs);

    let renderAnimationFrame: number | null = null;

    const scheduleUpdate = (): void => {
        if (renderAnimationFrame !== null) {
            cancelAnimationFrame(renderAnimationFrame);
        }
        renderAnimationFrame = requestAnimationFrame(() => {
            updateNav(container, divs);
        });
    };

    // Subscriptions
    const unsubToken: UnsubscribeFn = subscribe("token", scheduleUpdate);
    const unsubUser: UnsubscribeFn = subscribe("user", scheduleUpdate);
    const unsubMessages: UnsubscribeFn = subscribe("unreadMessages", scheduleUpdate);
    const unsubNotifications: UnsubscribeFn = subscribe("unreadNotifications", scheduleUpdate);

    // MutationObserver cleanup strategy from the old implementation
    const observer = new MutationObserver(() => {
        Promise.resolve().then(() => {
            if (!document.body.contains(container)) {
                if (renderAnimationFrame !== null) {
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