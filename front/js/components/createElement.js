/**
 * Recursively normalizes variant children layouts into a single flat array
 * Lifted outside the core execution scope to prevent runtime memory thrashing.
 */
function flattenChildren(items, targetArray = []) {
  if (items === null || items === undefined || items === false) {
    return targetArray;
  }

  if (typeof items === "string" || typeof items === "number" || items instanceof Node) {
    targetArray.push(items);
    return targetArray;
  }

  if (Array.isArray(items)) {
    const len = items.length;
    for (let i = 0; i < len; i++) {
      flattenChildren(items[i], targetArray);
    }
    return targetArray;
  }

  // Handle live collection node maps efficiently
  if (items instanceof NodeList || items instanceof HTMLCollection) {
    const len = items.length;
    for (let i = 0; i < len; i++) {
      flattenChildren(items[i], targetArray);
    }
    return targetArray;
  }

  // Fallback case
  targetArray.push(items);
  return targetArray;
}

export function createElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);
  const safeAttributes = attributes || {};

  for (const [key, value] of Object.entries(safeAttributes)) {
    if (value === undefined || value === null) continue;

    // 1. Event Subscriptions
    if (key === "events" && typeof value === "object") {
      for (const [eventName, handler] of Object.entries(value)) {
        if (typeof handler === "function") {
          element.addEventListener(eventName, handler);
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
      const classes = value.trim().split(/\s+/);
      for (let i = 0; i < classes.length; i++) {
        if (classes[i]) element.classList.add(classes[i]);
      }
      continue;
    }

    // 4. HTML5 Datasets
    if (key === "dataset" && typeof value === "object") {
      Object.assign(element.dataset, value);
      continue;
    }

    // 5. Explicit IDL Property Bindings vs HTML Attributes
    // Protect core properties that require live object access states
    if (key === "value" || key === "checked" || key === "disabled" || key === "id") {
      element[key] = value;
    } else {
      element.setAttribute(key, String(value));
    }
  }

  // --- Process and Inject Children flatly ---
  const flatChildren = [];
  flattenChildren(children, flatChildren);
  const childLength = flatChildren.length;

  for (let i = 0; i < childLength; i++) {
    const child = flatChildren[i];
    if (child === null || child === undefined || child === false) continue;

    if (child instanceof Node) {
      element.appendChild(child);
    } else if (typeof child === "string" || typeof child === "number") {
      element.appendChild(document.createTextNode(String(child)));
    } else {
      console.error("Invalid child passed to createElement:", child);
    }
  }

  return element;
}