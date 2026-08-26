export interface NoLinkOptions {
  title?: string;
  id?: string;
  events?: Record<string, EventListenerOrEventListenerObject>;
  classes?: string;
  styles?: Partial<CSSStyleDeclaration> | Record<string, string>;
}

/**
 * Span component with enhanced functionality
 */
const NoLink = (
  title: string = "Click Me",
  id: string = "",
  events: Record<string, EventListenerOrEventListenerObject> = {},
  classes: string = "",
  styles: Record<string, string> = { cursor: "pointer" }
): HTMLSpanElement => {
  // Input validation
  if (typeof title !== "string" || title.trim() === "") {
    throw new Error("A valid 'title' is required for the Span component.");
  }

  // Create the span element
  const span = document.createElement("span");
  span.textContent = title;
  span.id = id;

  // Apply inline styles dynamically
  for (const [key, value] of Object.entries(styles)) {
    span.style.setProperty(key, value);
  }

  // Add classes dynamically
  if (classes) {
    span.classList.add(...classes.split(" ").filter(Boolean));
  }

  // Add default class
  span.classList.add("nolink-span");

  // Attach custom event listeners
  for (const [event, handler] of Object.entries(events)) {
    if (typeof handler === "function" || typeof handler === "object") {
      span.addEventListener(event, handler);
    }
  }

  return span;
};

export default NoLink;
export { NoLink as NoLinkComponent };