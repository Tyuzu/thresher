// Re-export from API and UI modules for backward compatibility
export {
    addMerchandise,
    clearMerchForm,
    deleteMerch,
    editMerchForm,
    displayNewMerchandise
} from "./merchAPI.ts";

export {
    addMerchForm,
    displayMerchandise
} from "./merchUI.ts";
