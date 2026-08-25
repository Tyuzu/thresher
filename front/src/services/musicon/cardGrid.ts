import { createElement } from "../../components/createElement.js";

export function renderCardGrid<T>(
    title: string,
    items: T[],
    container: HTMLElement,
    createCardFn: (item: T) => HTMLElement,
    emptyMessage: string = "No items found."
): void {
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