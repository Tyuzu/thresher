
// --- i18n mock stub ---
const dict: Record<string, string> = {
    /* -------------------------
       Auth / state
     --------------------------*/
    "events.login_prompt": "Please log in to edit an event",
};

export function t(key: string): string {
    return dict[key] || key;
}