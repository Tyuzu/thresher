export type ChildInput =
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | ChildInput[]
  | NodeList
  | HTMLCollection;

type FlatChild = Node | string | number;

export interface ElementAttributes {
  events?: Record<string, EventListenerOrEventListenerObject>;
  styles?: Partial<CSSStyleDeclaration> | Record<string, string> | string;
  style?: string | Partial<CSSStyleDeclaration> | Record<string, string>;
  class?: string;
  dataset?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Recursively normalizes variant children layouts into a single flat array
 */
function flattenChildren(
  items: ChildInput,
  targetArray: FlatChild[] = []
): FlatChild[] {
  if (items === null || items === undefined || typeof items === "boolean") {
    return targetArray;
  }

  if (typeof items === "string" || typeof items === "number" || items instanceof Node) {
    targetArray.push(items);
    return targetArray;
  }

  if (Array.isArray(items) || items instanceof NodeList || items instanceof HTMLCollection) {
    const len = items.length;
    for (let i = 0; i < len; i++) {
      flattenChildren((items as ArrayLike<ChildInput>)[i], targetArray);
    }
    return targetArray;
  }

  targetArray.push(items);
  return targetArray;
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes?: ElementAttributes | null,
  children?: ChildInput
): HTMLElementTagNameMap[K];
export function createElement<T extends HTMLElement = HTMLElement>(
  tag: string,
  attributes?: ElementAttributes | null,
  children?: ChildInput
): T;
export function createElement(
  tag: string,
  attributes: ElementAttributes | null = {},
  children: ChildInput = []
): HTMLElement {
  // Allow shorthand calls where attributes may be passed as an empty string
  if (attributes !== null && (typeof attributes === 'string' || typeof attributes === 'number' || attributes instanceof Node || Array.isArray(attributes))) {
    children = attributes as unknown as ChildInput;
    attributes = {};
  }

  const element = document.createElement(tag);
  const safeAttributes = attributes || {};

  for (const key in safeAttributes) {
    if (!Object.prototype.hasOwnProperty.call(safeAttributes, key)) continue;
    const value = safeAttributes[key];
    if (value === undefined || value === null) continue;

    // 1. Event Subscriptions (Fixed)
    if (key === "events" && typeof value === "object" && value !== null) {
      const eventsObj = value as Record<string, EventListenerOrEventListenerObject | undefined>;
      for (const eventName in eventsObj) {
        if (!Object.prototype.hasOwnProperty.call(eventsObj, eventName)) continue;
        const listener = eventsObj[eventName];
        if (listener) {
          element.addEventListener(eventName, listener);
        }
      }
      continue;
    }

    // 2. Inline Style Dictionary Assignment
    if ((key === "style" || key === "styles") && typeof value === "object") {
      Object.assign(element.style, value);
      continue;
    }

    // 3. String Class Name Parsers
    if (key === "class" && typeof value === "string") {
      element.className = value.trim();
      continue;
    }

    // 4. HTML5 Datasets
    if (key === "dataset" && typeof value === "object") {
      Object.assign(element.dataset, value);
      continue;
    }

    // 5. Direct Property vs Attribute Binding
    if (key in element && key !== "list" && key !== "type" && key !== "draggable") {
      (element as unknown as Record<string, unknown>)[key] = value;
    } else {
      element.setAttribute(key, String(value));
    }
  }

  // Inject Children Flatly
  const flatChildren: FlatChild[] = [];
  flattenChildren(children, flatChildren);
  const childLength = flatChildren.length;

  for (let i = 0; i < childLength; i++) {
    const child = flatChildren[i];

    if (child instanceof Node) {
      element.appendChild(child);
    } else if (typeof child === "string" || typeof child === "number") {
      element.appendChild(document.createTextNode(String(child)));
    }
  }

  return element;
}