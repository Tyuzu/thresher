import "../../../css/layout/sticky5.css";
import { createElement } from "../createElement.js";
import { notifSVG, cartSVG, chatSVG, menuSVG, searchSVG } from "../svgs.js";
import { navigate } from "../../routes/index.js";
import { getState, subscribe } from "../../state/state.js";
import { openNotificationsModal } from "../../services/notifications/notifModal.js";
import { toggleSidebar } from "./sidebar.js";
import { createIconButton } from "../../utils/svgIconButton.js";

// Create a badge element securely
function createBadge(count) {
  return createElement("span", {
    class: "nav-badge"
  }, [count > 99 ? "99+" : String(count)]);
}

// Update navbar cleanly using document fragments instead of innerHTML wipes
function updateNav(container) {
  const isLoggedIn = !!getState("token");
  const unreadMessages = getState("unreadMessages") || 0;
  const unreadNotifications = getState("unreadNotifications") || 0;

  // State snapshot key to prevent redundant DOM wipes on identical updates
  const nextStateKey = `${isLoggedIn}-${unreadMessages}-${unreadNotifications}`;
  if (container.dataset.stateKey === nextStateKey) {
    return;
  }
  container.dataset.stateKey = nextStateKey;

  // Create a fragment to bundle DOM mutations off-screen
  const fragment = document.createDocumentFragment();

  // Sidebar Menu Button
  fragment.appendChild(
    createIconButton({
      classSuffix: "menu",
      svgMarkup: menuSVG,
      onClick: toggleSidebar,
      label: "Open menu"
    })
  );

  // Search Button
  fragment.appendChild(
    createIconButton({
      classSuffix: "search",
      svgMarkup: searchSVG,
      onClick: () => navigate("/search"),
      label: "Search"
    })
  );

  if (isLoggedIn) {
    // Messages/Chats Button
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

    // Cart Button
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

  // Swap out the container children in a single operation
  container.replaceChildren(fragment);
}

/**
 * Sticky Controls Component
 */
export function Sticky(divs) {
  const container = createElement("div", {
    class: "plypzstp"
  });

  // Initial render
  updateNav(container);

  // Debounce helper to prevent rapid sequential rendering calls
  let renderTimeout = null;
  const scheduleUpdate = () => {
    cancelAnimationFrame(renderTimeout);
    renderTimeout = requestAnimationFrame(() => {
      updateNav(container);
    });
  };

  // Subscriptions
  const unsubToken = subscribe("token", scheduleUpdate);
  const unsubMessages = subscribe("unreadMessages", scheduleUpdate);
  const unsubNotifications = subscribe("unreadNotifications", scheduleUpdate);

  // Setup observer directly on the document body to handle unmounting cleanup
  const observer = new MutationObserver(() => {
    // Wrap in microtask to ensure component isn't mid-mount
    Promise.resolve().then(() => {
      if (!document.body.contains(container)) {
        unsubToken?.();
        unsubMessages?.();
        unsubNotifications?.();
        cancelAnimationFrame(renderTimeout);
        observer.disconnect();
      }
    });
  });

  // Observe subtree mutations so nested containers trigger cleanups properly
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  return container;
}

export { Sticky as sticky };