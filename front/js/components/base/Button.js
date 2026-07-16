import { createElement } from '../createElement'; // Adjust path as needed

// Button component with enhanced functionality
const Button = (
  title = "Click Me",
  id = "",
  events = {},
  classes = "",
  styles = {},
  ...rest // Captures anything else like dataset, disabled status, etc.
) => {
  // Input validation
  if (typeof title !== "string" || title.trim() === "") {
    throw new Error("A valid 'title' is required for the Button component.");
  }

  // Use the helper! All style, event, and class loops are handled automatically now.
  return createElement(
    "button", 
    {
      id,
      class: `button ${classes}`.trim(), // Combine default and custom classes
      style: styles,
      events,
      ...rest
    }, 
    title
  );
};

export default Button;
export { Button };

/*
import { createElement } from '../createElement'; // Adjust path as needed

const Button = ({
  title = "Click Me",
  id = "",
  events = {},
  classes = "",
  styles = {},
  ...rest // Captures anything else like dataset, disabled status, etc.
} = {}) => {
  // Input validation
  if (typeof title !== "string" || title.trim() === "") {
    throw new Error("A valid 'title' is required for the Button component.");
  }

  // Use the helper! All style, event, and class loops are handled automatically now.
  return createElement(
    "button", 
    {
      id,
      class: `button ${classes}`.trim(), // Combine default and custom classes
      style: styles,
      events,
      ...rest
    }, 
    title
  );
};

export default Button;
export { Button };
*/