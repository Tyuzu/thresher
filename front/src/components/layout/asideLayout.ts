import "../../../css/layout/aside.css";
import { createElement } from "../../components/createElement.js";
import { adspace } from "../../services/ads/newads.js";

type PrimitiveContent = Node | string | number | boolean | null | undefined;

export type NestedContent =
  | PrimitiveContent
  | PrimitiveContent[]
  | PrimitiveContent[][]
  | PrimitiveContent[][][]
  | PrimitiveContent[][][][];

export interface AsideSectionInput {
  title?: string;
  content?: NestedContent;
  className?: string;
}

export type SectionType = Node | AsideSectionInput | null | undefined;

export interface AsideContentOptions {
  title?: string;
  actions?: NestedContent;
  sections?: SectionType[];
  children?: NestedContent;
  showAd?: boolean;
  page?: string;
  adPosition?: string;
  adPlacement?: "top" | "middle" | "bottom";
  adOptions?: Record<string, any>;
  asContainer?: boolean;
}

/**
 * Normalizes mixed inputs into a flat array of valid DOM Nodes.
 */
const normalizeContent = (content: NestedContent): Node[] => {
  if (content == null || content === false) return [];

  const stack: unknown[] = [content];
  const flatItems: PrimitiveContent[] = [];

  while (stack.length > 0) {
    const item = stack.pop();
    if (Array.isArray(item)) {
      for (let i = item.length - 1; i >= 0; i--) {
        stack.push(item[i]);
      }
    } else {
      flatItems.push(item as PrimitiveContent);
    }
  }

  return flatItems
    .filter((item): item is NonNullable<PrimitiveContent> => item != null && item !== false)
    .map((item) => (item instanceof Node ? item : document.createTextNode(String(item))));
};

/**
 * Creates structured sections or elements inside an aside layout.
 */
function renderSection(section: SectionType): HTMLElement | Node | null {
  if (!section) return null;
  if (section instanceof Node) return section;

  const children: Node[] = [];
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
  asContainer = false
}: AsideContentOptions = {}): HTMLElement | Node[] {
  // 1. Resolve optional ad node
  const adNode: Node | null = showAd ? adspace(adPosition, page, adOptions) : null;

  // 2. Build title and actions
  const titleNode = title ? createElement("h2", { class: "aside-title" }, [title]) : null;

  const normalizedActions = normalizeContent(actions);
  const actionsContainer = normalizedActions.length > 0
    ? createElement("div", { class: "aside-actions" }, normalizedActions)
    : null;

  // 3. Process sections & children
  const renderedSections = sections.map(renderSection).filter((sec): sec is Node => sec !== null);
  const normalizedChildren = normalizeContent(children);

  // 4. Assemble components based on ad placement
  const content: Node[] = [
    adPlacement === "top" ? adNode : null,
    titleNode,
    actionsContainer,
    adPlacement === "middle" ? adNode : null,
    ...renderedSections,
    ...normalizedChildren,
    adPlacement === "bottom" ? adNode : null
  ].filter((item): item is Node => item !== null);

  // 5. Return container element or array of nodes
  if (asContainer) {
    return createElement("aside", { class: "aside-container" }, content);
  }

  return content;
}