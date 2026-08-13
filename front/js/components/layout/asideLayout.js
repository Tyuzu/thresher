import "../../../css/layout/aside.css";
import { createElement } from "../../components/createElement.js";
import { adspace } from "../../services/ads/newads.js";

/**
 * Normalizes mixed inputs into a flat array of valid DOM Nodes.
 */
const normalizeContent = (content) => {
  if (content == null || content === false) return [];

  return [content]
    .flat(Infinity)
    .filter(Boolean)
    .map((item) => (item instanceof Node ? item : document.createTextNode(String(item))));
};

/**
 * Creates structured sections or elements inside an aside layout.
 */
function renderSection(section) {
  if (!section) return null;
  if (section instanceof Node) return section;

  const children = [];
  if (section.title) {
    children.push(createElement("h3", { class: "aside-section-title" }, [section.title]));
  }
  if (section.content) {
    children.push(...normalizeContent(section.content));
  }

  const className = ["aside-section", section.className].filter(Boolean).join(" ");
  return createElement("section", { class: className }, children);
}

/**
 * Reusable sidebar element builder with title, actions, sections, custom content, and ad placement.
 */
export function createAsideContent({
  title = "Actions",
  actions = [],
  sections = [],
  children = [],
  showAd = true,
  page,
  adPosition = "aside",
  adPlacement = "top",
  adOptions = {},
  asContainer = false // Defaulted to true so it always returns a single HTMLElement
} = {}) {
  // 1. Resolve optional ad node
  const adNode = showAd ? adspace(adPosition, page, adOptions) : null;

  // 2. Build title and actions
  const titleNode = title ? createElement("h2", { class: "aside-title" }, [title]) : null;

  const normalizedActions = normalizeContent(actions);
  const actionsContainer = normalizedActions.length > 0
    ? createElement("div", { class: "aside-actions" }, normalizedActions)
    : null;

  // 3. Process sections & children
  const renderedSections = sections.map(renderSection).filter(Boolean);
  const normalizedChildren = normalizeContent(children);

  // 4. Assemble components based on ad placement
  const content = [
    adPlacement === "top" && adNode,
    titleNode,
    actionsContainer,
    adPlacement === "middle" && adNode,
    ...renderedSections,
    ...normalizedChildren,
    adPlacement === "bottom" && adNode
  ].filter(Boolean);

  // 5. Return container element
  if (asContainer) {
    return createElement("aside", { class: "aside-container" }, content);
  }

  return content;
}