import { createElement } from "../../../components/createElement.ts";
import { HireWorkerCard } from "./WorkerCard.ts";

export function renderWorkerList(listEl, workers, isGridView, isLoggedIn) {
  listEl.replaceChildren();
  listEl.className = isGridView ? "grid-view" : "list-view";

  if (!workers.length) {
    listEl.appendChild(createElement("p", {}, ["No workers found."]));
    return;
  }

  workers.forEach((worker) => {
    listEl.appendChild(HireWorkerCard(worker, isLoggedIn));
  });
}
