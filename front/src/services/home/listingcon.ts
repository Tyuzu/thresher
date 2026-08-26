import { createElement, ChildInput } from "../../components/createElement.js";
import { navigate } from "../../routes/navigate.js";
import { fetchHomeCards } from "./api.js";
import Button from "../../components/base/Button.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import Imagex from "../../components/base/Imagex.js";
import { createTabs } from "../../utils/persistTabs.js";
import { subscribe } from "../../state/state.js";

export const clearElement = (el: HTMLElement | Element): void => {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
};

const categoryMap = {
  Places: EntityType.PLACE,
  Events: EntityType.EVENT,
  Baitos: EntityType.BAITO,
  Products: EntityType.PRODUCT,
  Posts: EntityType.BLOGPOST,
} as const;

type CategoryKey = keyof typeof categoryMap;

const getEntityByCategory = (category: CategoryKey): EntityType => categoryMap[category];

interface ImageCardData {
  banner?: string;
  title?: string;
  description?: string;
  href: string;
}
function createImageCard({ banner, title, description, href }: ImageCardData, entitytype: EntityType): HTMLElement {
  const safeTitle = title || "Untitled";
  const imgSrc = resolveImagePath(entitytype, PictureType.THUMB, banner);

  const card = createElement(
    "div",
    { class: "image-card", role: "button", tabIndex: 0, "aria-label": `Open ${safeTitle}` },
    [
      Imagex({ src: imgSrc, alt: safeTitle }),
      createElement("div", { class: "card-info" }, [
        createElement("h4", {}, [safeTitle]),
        createElement("p", {}, [description || ""]),
        Button({
          title: "Explore",
          classes: "card-link",
          events: {
            click: (e: Event) => {
              e.stopPropagation();
              navigate(href);
            },
          },
        }),
      ]),
    ]
  );

  card.addEventListener("click", () => navigate(href));
  card.addEventListener("keypress", (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      navigate(href);
    }
  });

  return card;
}

// -------------------- Pagination + Cards --------------------
function createCardSection() {
  const cardGrid = createElement("div", { class: "card-grid" }, []);
  const loadMoreWrapper = createElement("div", { class: "load-more-wrap" }, []);
  const pagingState: Record<string, { skip: number; limit: number; done: boolean; loading: boolean }> = {};
  const DEFAULT_LIMIT = 20;

  const fetchPage = async (category: string, skip: number, limit: number) =>
    fetchHomeCards(category, skip, limit);

  const showMessage = (msg: string) => createElement("p", { class: "status-message" }, [msg]);
  const makeLoadMoreButton = (category: CategoryKey) =>
    Button({
      title: "Load more",
      id: "home-load-more",
      classes: "load-more-btn",
      events: {
        click: () => renderCardsPage(category, false),
      },
    });
  const renderCardsPage = async (category: CategoryKey, initial: boolean = false): Promise<void> => {
    if (!pagingState[category]) {
      pagingState[category] = { skip: 0, limit: DEFAULT_LIMIT, done: false, loading: false };
    }

    const state = pagingState[category];
    if (state.loading || state.done) {
      return;
    }

    state.loading = true;

    if (initial) {
      clearElement(cardGrid);
      cardGrid.append(showMessage("Loading..."));
    } else {
      loadMoreWrapper.setAttribute("data-loading", "true");
    }

    try {
      const data = await fetchPage(category, state.skip, state.limit);

      if (initial) {
        clearElement(cardGrid);
      }
      loadMoreWrapper.removeAttribute("data-loading");

      if (!data?.length) {
        if (initial) {
          cardGrid.append(showMessage("No results found."));
        }
        state.done = true;
        clearElement(loadMoreWrapper);
        return;
      }

      const fragment = document.createDocumentFragment();
      data.forEach((c) =>
        fragment.append(createImageCard(c, getEntityByCategory(category)))
      );
      cardGrid.append(fragment);

      state.skip += data.length;

      clearElement(loadMoreWrapper);
      if (data.length === state.limit) {
        loadMoreWrapper.append(makeLoadMoreButton(category));
      } else {
        state.done = true;
      }
    } catch {
      if (initial) {
        clearElement(cardGrid);
        cardGrid.append(showMessage("Failed to load cards."));
      }
    } finally {
      state.loading = false;
    }
  };

  return { cardGrid, loadMoreWrapper, renderCardsPage, pagingState };
}

// -------------------- MAIN: Tabs + Reactive Update --------------------
export function createListingTabs(): HTMLElement {
  const wrapper = createElement("div", { class: "listing-tabs-wrapper" }, []);

  function render(): void {
    wrapper.replaceChildren();

    const categories = Object.keys(categoryMap) as CategoryKey[];

    const tabs = categories.map((id) => ({
      id,
      title: id,
      render: (container: HTMLElement) => {
        const section = createCardSection();
        container.append(section.cardGrid, section.loadMoreWrapper);
        section.renderCardsPage(id, true);
      },
    }));

    wrapper.append(createTabs(tabs, "homeTabs", "Places"));
  }

  subscribe("token", render);
  subscribe("userProfile.role", render);

  render();

  return wrapper;
}