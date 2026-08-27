import "../../../css/ui/Button.css";
import { createElement } from "../createElement.js";

export interface ButtonOptions {
  title?: string;
  id?: string;
  events?: Record<string, EventListenerOrEventListenerObject> | Record<string, unknown>;
  classes?: string;
  styles?: Partial<CSSStyleDeclaration> | Record<string, string>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  [key: string]: unknown;
}

/**
 * Button component with enhanced functionality
 */
const Button = (...args: any[]): HTMLButtonElement => {
  // Support two call styles: Button(options) and legacy Button(title, id, options?, classes?)
  let opts: ButtonOptions = {};

  if (args.length === 1 && typeof args[0] === "object") {
    opts = args[0] as ButtonOptions;
  } else {
    // positional args
    opts.title = typeof args[0] === "string" ? args[0] : "Click Me";
    if (typeof args[1] === "string") opts.id = args[1];
    if (typeof args[2] === "object" && args[2] !== null) {
      // the old third arg was often an options object
      const third = args[2] as Record<string, unknown>;

      // Use bracket notation here 👇
      if (third['events']) {
        opts.events = third['events'] as Record<string, (e: Event) => void>;
      }

      Object.assign(opts, third);
    }
    if (typeof args[3] === "string") opts.classes = args[3];
  }

  const {
    title = "Click Me",
    id = "",
    events = {},
    classes = "",
    styles = {},
    ...rest
  } = opts;

  if (typeof title !== "string" || title.trim() === "") {
    throw new Error("A valid 'title' is required for the Button component.");
  }

  return createElement(
    "button",
    {
      id,
      class: `button ${classes}`.trim(),
      style: styles,
      events: events as Record<string, EventListenerOrEventListenerObject>,
      ...rest
    },
    title
  );
};

export { Button };
export default Button;
export { Button as ButtonComponent };