import "../../../css/ui/Button.css";
import { createElement } from "../createElement.js";

export interface ButtonOptions {
  title?: string;
  id?: string;
  events?: Record<string, (event: Event) => void>;
  classes?: string;
  styles?: Partial<CSSStyleDeclaration> | Record<string, string>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  [key: string]: unknown;
}

/**
 * Button component with enhanced functionality
 */
const Button = ({
  title = "Click Me",
  id = "",
  events = {},
  classes = "",
  styles = {},
  ...rest
}: ButtonOptions = {}): HTMLElement => {
  // Input validation
  if (typeof title !== "string" || title.trim() === "") {
    throw new Error("A valid 'title' is required for the Button component.");
  }

  // Use the helper! All style, event, and class loops are handled automatically now.
  return createElement(
    "button",
    {
      id,
      class: `button ${classes}`.trim(),
      style: styles,
      events,
      ...rest
    },
    title
  );
};

export default Button;
export { Button };