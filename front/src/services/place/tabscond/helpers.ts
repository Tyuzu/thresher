import { createElement } from "../../../components/createElement.js";

// ─── Helpers (same as Part 1) ──────────────────────────────────────────────────

export function showLoading(container) {
  container.appendChild(
    createElement("div", { class: "loading" }, [
      createElement("p", {}, ["Loading…"])
    ])
  );
}

export function showError(container, message) {
  container.appendChild(
    createElement("div", { class: "tab-section error" }, [
      createElement("p", {}, [message])
    ])
  );
  console.warn(message);
}
