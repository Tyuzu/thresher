import { createElement } from "./createElement.js";
import { notifSVG, cartSVG, chatSVG, menuSVG, searchSVG } from "./svgs.js";
import { navigate } from "../routes/index.js";
import { getState, subscribe } from "../state/state.js";
import { openNotificationsModal } from "../services/notifications/notifModal.js";
import { toggleSidebar } from "./sidebar.js";
import { createIconButton } from "../utils/svgIconButton.js";

// Create a badge element securely
function createBadge(count) {
  const badge = createElement("span", {
    class: "nav-badge"
  });
  badge.textContent = count > 99 ? "99+" : String(count);
  return badge;
}

// Update navbar cleanly using document fragments instead of innerHTML wipes
function updateNav(container) {
  const isLoggedIn = !!getState("token");
  const unreadMessages = getState("unreadMessages") || 0;
  const unreadNotifications = getState("unreadNotifications") || 0;

  // Create a fragment to bundle DOM mutations off-screen
  const fragment = document.createDocumentFragment();

  // Sidebar Menu Button
  fragment.appendChild(
    createIconButton({
      classSuffix: "pause",
      svgMarkup: menuSVG,
      onClick: toggleSidebar,
      label: ""
    })
  );

  // Search Button
  fragment.appendChild(
    createIconButton({
      classSuffix: "dld",
      svgMarkup: searchSVG,
      onClick: () => navigate("/search"),
      label: ""
    })
  );

  if (isLoggedIn) {
    // Messages/Chats Button
    const chatBtn = createIconButton({
      classSuffix: "play",
      svgMarkup: chatSVG,
      onClick: () => navigate("/newchats"),
      label: ""
    });

    if (unreadMessages > 0) {
      chatBtn.style.position = "relative";
      chatBtn.appendChild(createBadge(unreadMessages));
    }
    fragment.appendChild(chatBtn);

    // Cart Button
    fragment.appendChild(
      createIconButton({
        classSuffix: "edit",
        svgMarkup: cartSVG,
        onClick: () => navigate("/cart"),
        label: ""
      })
    );

    // Notifications Button
    const notifBtn = createIconButton({
      classSuffix: "stop",
      svgMarkup: notifSVG,
      onClick: openNotificationsModal,
      label: ""
    });

    if (unreadNotifications > 0) {
      notifBtn.style.position = "relative";
      notifBtn.appendChild(createBadge(unreadNotifications));
    }
    fragment.appendChild(notifBtn);
  }

  // Swap out the container children in a single operation
  container.replaceChildren(fragment);
}

/**
 * Sticky Navigation Component
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

  // Setup observer directly on the container's parent when it mounts
  // to avoid subtree-scanning the entire document.body
  const observer = new MutationObserver(() => {
    if (!document.body.contains(container)) {
      unsubToken?.();
      unsubMessages?.();
      unsubNotifications?.();
      cancelAnimationFrame(renderTimeout);
      observer.disconnect();
    }
  });

  // Observe the document body but without subtree scanning for improved layout performance
  observer.observe(document.body, {
    childList: true,
    subtree: false // Changed to false to avoid scanning deep DOM hierarchies
  });

  return container;
}

export { Sticky as sticky };