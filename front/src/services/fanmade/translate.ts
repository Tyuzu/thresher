import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.js";

/* ------------------------------------------------------
    TRANSLATION HELPERS
------------------------------------------------------ */
export async function translateText(text: string): Promise<string> {
  await new Promise(r => setTimeout(r, 300)); // simulate delay
  return `[Translated] ${text}`;
}

export async function handleTranslationToggle(
  toggle: HTMLElement,
  originalText: string,
  container: HTMLElement
): Promise<void> {
  const showing = toggle.dataset.state === "translated";

  if (showing) {
    container.style.display = "none";
    toggle.dataset.state = "original";
    if (toggle.firstChild) {
      toggle.firstChild.nodeValue = "See Translation";
    }
    return;
  }

  if (!container.firstChild) {
    if (toggle.firstChild) {
      toggle.firstChild.nodeValue = "Translating...";
    }
    try {
      const translated = await translateText(originalText);
      container.append(createElement("p", { class: "translated-text" }, [translated]));
    } catch {
      Notify("Translation failed", { type: "error" });
    }
  }

  container.style.display = "block";
  toggle.dataset.state = "translated";
  if (toggle.firstChild) {
    toggle.firstChild.nodeValue = "Hide Translation";
  }
}