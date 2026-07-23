// i18n.js
const dict = {
  /* -------------------------
     Auth / state
  --------------------------*/
  "events.login_prompt": "Please log in to edit an event",
};

export function t(key) {
  return dict[key] || key;
}
