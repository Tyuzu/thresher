import { createElement } from "../../components/createElement.js";
import { adspace } from "../../services/ads/newads.js";

export type ContentInput =
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | ContentInput[];

export interface MainLayoutConfig {
  mainContent?: ContentInput;
  asideContent?: ContentInput;
  pageClass?: string;
  page?: string;
  showMainAd?: boolean;
  mainAdPosition?: string;
  mainAdPlacement?: "top" | "bottom" | string;
  mainAdOptions?: Record<string, unknown>;
}

/**
 * Normalizes mixed inputs into a flat array of valid DOM Nodes.
 */
const normalizeContent = (content: ContentInput): Node[] => {
  if (content == null || content === false) return [];

  const rawArray = Array.isArray(content) ? content : [content];

  return (rawArray as unknown[])
    .flat(10)
    .filter((item): item is NonNullable<unknown> => Boolean(item) && item !== false)
    .map((item) => (item instanceof Node ? item : document.createTextNode(String(item))));
};

/**
 * Creates a standard two-column page structure with a main content area and an aside sidebar.
 */
export function createMainLayout({
  mainContent = [],
  asideContent = [],
  pageClass = "page-layout",
  page,
  showMainAd = false,
  mainAdPosition = "main-bottom",
  mainAdPlacement = "bottom",
  mainAdOptions = {}
}: MainLayoutConfig = {}): HTMLDivElement {
  // 1. Resolve optional main ad node
  const mainAdNode: Node | null = showMainAd
    ? adspace(mainAdPosition, page, mainAdOptions)
    : null;

  // 2. Normalize and order main section children
  const normalizedMain = normalizeContent(mainContent);
  const finalMainContent: Node[] = [
    mainAdPlacement === "top" && mainAdNode,
    ...normalizedMain,
    mainAdPlacement === "bottom" && mainAdNode
  ].filter((item): item is Node => item instanceof Node);

  // 3. Construct layout containers
  const containerClass = ["two-column", pageClass].filter(Boolean).join(" ");

  const main = createElement("main", { class: "layout-main" }, finalMainContent);
  const aside = createElement("aside", { class: "layout-aside" }, normalizeContent(asideContent));

  return createElement("div", { class: containerClass }, [main, aside]) as HTMLDivElement;
}