import "../../../css/layout/header5.css";
import { getState, subscribe } from "../../state/state.ts";
import { webSiteName } from "../../config/env.ts";
import { navigate } from "../../routes/index.ts";
import { logout } from "../../services/auth/authService.ts";
import { settingsSVG, moonSVG, profileSVG, shopBagSVG, logoutSVG, cardSVG } from "../svgs.ts";
import { createElement } from "../createElement.ts";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.ts";
import Imagex from "../base/Imagex.ts";
import { sticky } from "./sticky.ts";
import Button from "../base/Button.ts";
import { loadTheme, toggleTheme } from "./themeManager.ts";

function createIconButton(svg, href, onClick) {
  const icon = createElement("span", { class: "icon" }, []);
  icon.innerHTML = svg;

  const anchor = createElement("div", { class: "iconic-button" }, [icon]);
  if (href) {
    anchor.href = href;
  }
  if (onClick) {
    anchor.addEventListener("click", onClick);
  }

  return anchor;
}

function createDropdownMenu(id, labelText, items) {
  const toggle = createElement("button", { id, class: "menu-toggle" }, [labelText]);
  const menu = createElement("div", { class: "menu-content", "aria-label": labelText }, []);

  items.forEach(({ href, text }) => {
    const link = createElement("a", { class: "profile-menu-item", href }, [text]);
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navigate(href);
      menu.classList.remove("open");
    });
    menu.append(link);
  });

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("open");
  });

  return createElement("div", { class: "header-content-dropdown" }, [toggle, menu]);
}

export function createProfileSection() {
  const user = getState("user");
  const userid = getState("user").userid;
  const username = user?.username || user?.name || "Profile";
  const imageSrc = userid ? `${userid}.jpg` : "default.jpg";

  const img = Imagex({
    src: resolveImagePath(EntityType.USER, PictureType.THUMB, imageSrc),
    alt: username,
    classes: "profile-pic"
  });

  const toggle = createElement("div", { class: "profile-toggle", tabIndex: 0 }, [img]);

  const links = [
    { href: "/profile", text: username, icon: profileSVG },
    { href: "/my-orders", text: "My Orders", icon: shopBagSVG },
    { href: "/wallet", text: "Wallet", icon: cardSVG },
    { href: "/settings", text: "Settings", icon: settingsSVG }
  ];

  const menu = createElement("div", { class: "profile-menu" }, []);

  links.forEach(({ href, text, icon }) => {
    const label = createElement("span", {}, [text]);
    const iconSpan = createElement("span", {}, []);
    if (icon) {
      iconSpan.innerHTML = icon;
    }

    const link = createElement("a", { class: "profile-menu-item", href }, [iconSpan, label]);
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navigate(href);
      menu.classList.remove("open");
    });

    menu.append(link);
  });

  const logoutBtn = createElement("button", { class: "profile-menu-item logout" }, []);
  logoutBtn.innerHTML = logoutSVG;
  logoutBtn.append(createElement("span", {}, ["Logout"]));
  logoutBtn.addEventListener("click", () => {
    menu.classList.remove("open");
    logout();
  });
  menu.append(logoutBtn);

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("open");
  });

  toggle.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      menu.classList.toggle("open");
    }
  });

  document.addEventListener("click", () => menu.classList.remove("open"));

  return createElement("div", { class: "dropdown" }, [toggle, menu]);
}

function renderUserSection() {
  const container = createElement("div", { class: "user-area" }, []);

  function update() {
    container.replaceChildren();
    const token = getState("token");
    const user = getState("user");
    const userid = user?.id || user?.userid || null;

    if (token && userid) {
      container.append(createProfileSection());
    } else {
      const loginBtn = Button("Login", "login-button", {
        click: () => {
          navigate("/login");
        }
      }, "login-btn", { border: "none", cursor: "pointer" });

      container.append(loginBtn);
    }
  }

  subscribe("token", update);
  subscribe("user", update);
  subscribe("userProfile.role", update);

  update();
  return container;
}

function buildNav() {
  const nav = createElement("div", { class: "header-content" }, []);
  const token = getState("token");

  if (token) {
    const createLinks = [
      { href: "/create-farm", text: "Farm" },
      { href: "/create-recipe", text: "Recipe" }
    ];
    nav.append(createDropdownMenu("create-menu", "Create", createLinks));
  }

  nav.append(
    createIconButton(moonSVG, null, toggleTheme),
    renderUserSection()
  );

  return nav;
}

function enableNavAutoUpdate(initialNavRef) {
  let navRef = initialNavRef;

  function updateNav() {
    if (!navRef || !navRef.parentNode) return;
    const newNav = buildNav();
    navRef.replaceWith(newNav);
    navRef = newNav;
  }

  subscribe("token", updateNav);
  subscribe("userProfile.role", updateNav);
}

function createHeader() {
  const header = document.getElementById("pageheader");
  if (!header || header.hasChildNodes()) {
    return;
  }

  header.className = "main-header";

  const logo = createElement("div", { class: "logo" }, [
    createElement("a", { href: "/home", class: "logo-link" }, [webSiteName])
  ]);

  const userid = getState("user")?.id || getState("user")?.userid || "default";

  const sky = createElement("div", { class: "hflexcen" }, []);
  sky.append(
    sticky({
      imglink: Imagex({
        src: resolveImagePath(EntityType.USER, PictureType.THUMB, `${userid}.jpg`),
        alt: "Profile",
        classes: "profile-pic"
      })
    })
  );

  const nav = buildNav();
  header.append(logo, sky, nav);

  enableNavAutoUpdate(nav);
  loadTheme();
}

export { createHeader as createheader };