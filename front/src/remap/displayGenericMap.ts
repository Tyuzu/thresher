import { createElement } from "../components/createElement.js";

export function displayGenericMap(container: HTMLElement, config: any): void {
  if (!container) return;
  const el = createElement("div", { class: "generic-map" }, [
    createElement("p", {}, ["Generic map placeholder"])
  ]) as HTMLElement;
  container.appendChild(el);
}
