import { createElement } from "../../components/createElement.ts";

export function renderCardGrid<T>(
  title: string,
  items: T[],
  container: HTMLElement,
  createCardFn: (item: T) => HTMLElement,
  emptyMessage = "No items found."
) {
  if (!items.length) {
    container.append(createElement("p", {}, [emptyMessage]));
    return;
  }

  const section = createElement("div", { class: "music-section" }, [
    createElement("h3", {}, [title])
  ]);
  
  const frag = document.createDocumentFragment();
  items.forEach(item => frag.append(createCardFn(item)));
  section.append(frag);
  
  container.append(section);
}