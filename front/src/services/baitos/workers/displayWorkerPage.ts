// workerRouter.ts

import { getState } from "../../../state/state";
import { displayWorkerProfile } from "./displayWorkerProfile";
import { displayManageWorkerProfile } from "./displayManageWorkerProfile";
import { displayCreateOrEditBaitoProfile } from "../create/createBaitoProfile";
import { getWorker } from "../api.js";
import { createElement } from "../../../components/createElement";
import { Worker } from "./WorkerModal";

/**
 * Main entry point - routes to correct interface based on user role
 */
export async function displayWorkerPage(
    contentContainer: HTMLElement,
    isLoggedIn: boolean,
    workerId: string | number
): Promise<void> {
    const userState = getState("user") as { userid?: string | number } | null;
    const currentUser = userState?.userid;
    
    // Fetch worker to check ownership
    let worker: Worker | null = null;
    try {
        worker = (await getWorker(workerId)) as Worker;
    } catch (_e) {
        contentContainer.replaceChildren(
            createElement("p", { class: "error-msg" }, ["⚠️ Failed to load worker profile."])
        );
        return;
    }

    if (!worker) {
        contentContainer.replaceChildren(
            createElement("p", { class: "error-msg" }, ["⚠️ Worker profile not found."])
        );
        return;
    }

    // Route based on ownership
    if (worker.userid === currentUser) {
        // Worker viewing their own profile - show management interface
        displayManageWorkerProfile(contentContainer, isLoggedIn, workerId);
    } else {
        // Other user viewing this worker - show hirer interface
        displayWorkerProfile(contentContainer, isLoggedIn, workerId);
    }
}

export function displayCreateBaitoProfile(
    isLoggedIn: boolean,
    contentContainer: HTMLElement
): Promise<void> | void {
    return displayCreateOrEditBaitoProfile(isLoggedIn, contentContainer, "create");
}

export function displayEditBaitoProfile(
    isLoggedIn: boolean,
    contentContainer: HTMLElement,
    workerId: string | number
): Promise<void> | void {
    return displayCreateOrEditBaitoProfile(isLoggedIn, contentContainer, "edit", workerId);
}