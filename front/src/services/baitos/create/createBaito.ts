// createBaito.ts

import { createOrEditBaito } from "./createOrEditBaito";

/**
 * Initiates the flow for creating a new Baito job listing.
 * 
 * @param isLoggedIn - Indicates whether the current user is logged in.
 * @param contentContainer - The HTML container element where the form/content will be rendered.
 */
export async function createBaito(
    isLoggedIn: boolean,
    contentContainer: HTMLElement
): Promise<void> {
    createOrEditBaito({ 
        isLoggedIn: isLoggedIn, 
        contentContainer: contentContainer 
    });
}