// renderWorkerList.ts

import { createElement } from "../../../components/createElement";
import { HireWorkerCard } from "./WorkerCard";
import { Worker } from "./openHireWorkerModal"; // Assuming Worker interface is exported from there or defined here

export function renderWorkerList(
    listEl: HTMLElement,
    workers: Worker[],
    isGridView: boolean,
    isLoggedIn: boolean
): void {
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