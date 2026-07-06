import { createElement } from "./createElement.js";
import { notifSVG, cartSVG, chatSVG, menuSVG, searchSVG } from "./svgs.js";
import { navigate } from "../routes/index.js";
import { getState, subscribe } from "../state/state.js";
import { openNotificationsModal } from "../services/notifications/notifModal.js";
import { toggleSidebar } from "./sidebar.js";
import { createIconButton } from "../utils/svgIconButton.js";
// import { tmessaging } from "./tumblrSvgs.js";
// import { openCartModal } from "../services/cart/cartModal.js";

// Create a badge element
function createBadge(count) {
  const badge = createElement("span", {
    class: "nav-badge"
  });

  badge.textContent = count > 99 ? "99+" : String(count);

  return badge;
}

// Update navbar
function updateNav(container, _divs) {
  const isLoggedIn = !!getState("token");

  const unreadMessages = getState("unreadMessages") || 0;
  const unreadNotifications = getState("unreadNotifications") || 0;

  container.innerHTML = "";

  container.appendChild(
    createIconButton({
      classSuffix: "pause",
      svgMarkup: menuSVG,
      onClick: toggleSidebar,
      label: ""
    })
  );

  container.appendChild(
    createIconButton({
      classSuffix: "dld",
      svgMarkup: searchSVG,
      onClick: () => navigate("/search"),
      label: ""
    })
  );

  if (isLoggedIn) {
    // Messages
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

    container.appendChild(chatBtn);

    // Cart
    container.appendChild(
      createIconButton({
        classSuffix: "edit",
        svgMarkup: cartSVG,
        onClick: () => navigate("/cart"),
        label: ""
      })
    );

    // Notifications
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

    container.appendChild(notifBtn);
  }
}

// Sticky container
export function Sticky(divs) {
  const container = createElement("div", {
    class: "plypzstp"
  });

  updateNav(container, divs);

  const unsubToken = subscribe("token", () => {
    updateNav(container, divs);
  });

  const unsubMessages = subscribe("unreadMessages", () => {
    updateNav(container, divs);
  });

  const unsubNotifications = subscribe("unreadNotifications", () => {
    updateNav(container, divs);
  });

  const observer = new MutationObserver(() => {
    if (!document.body.contains(container)) {
      unsubToken?.();
      unsubMessages?.();
      unsubNotifications?.();
      observer.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  return container;
}

export { Sticky as sticky };