/**
 * Recursively normalizes variant children layouts into a single flat array
 */
function flattenChildren(items, targetArray = []) {
  if (items === null || items === undefined || items === false) {
    return targetArray;
  }

  if (typeof items === "string" || typeof items === "number" || items instanceof Node) {
    targetArray.push(items);
    return targetArray;
  }

  if (Array.isArray(items) || items instanceof NodeList || items instanceof HTMLCollection) {
    const len = items.length;
    for (let i = 0; i < len; i++) {
      flattenChildren(items[i], targetArray);
    }
    return targetArray;
  }

  targetArray.push(items);
  return targetArray;
}

export function createElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);
  const safeAttributes = attributes || {};

  for (const key in safeAttributes) {
    if (!Object.prototype.hasOwnProperty.call(safeAttributes, key)) continue;
    const value = safeAttributes[key];
    if (value === undefined || value === null) continue;

    // 1. Event Subscriptions
    if (key === "events" && typeof value === "object") {
      for (const eventName in value) {
        if (typeof value[eventName] === "function") {
          element.addEventListener(eventName, value[eventName]);
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
      element[key] = value;
    } else {
      element.setAttribute(key, String(value));
    }
  }

  // Inject Children Flatly
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
    }
  }

  return element;
}