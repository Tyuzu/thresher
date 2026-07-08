function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);

    // FIX: Prevents Object.entries crashing if null/undefined is passed explicitly
    const safeAttributes = attributes || {};

    for (const [key, value] of Object.entries(safeAttributes)) {
        if (key === "events" && value && typeof value === "object") {
            for (const [eventName, handler] of Object.entries(value)) {
                if (typeof handler === "function") {
                    element.addEventListener(eventName, handler);
                }
            }
        } else if ((key === "style" || key === "styles") && value && typeof value === "object") {
            for (const [prop, val] of Object.entries(value)) {
                element.style[prop] = val;
            }
        } else if (key === "class" && typeof value === "string") {
            const classes = value.trim().split(/\s+/).filter(c => c.length > 0);
            if (classes.length) {
                element.classList.add(...classes);
            }
        } else if (key === "dataset" && value && typeof value === "object") {
            for (const [dataKey, dataValue] of Object.entries(value)) {
                element.dataset[dataKey] = dataValue;
            }
        } else if (key in element) {
            if (value !== undefined && value !== null) {
                element[key] = value;
            }
        } else if (value !== undefined && value !== null) {
            element.setAttribute(key, value);
        }
    }

    const normalizeChildren = (items) => {
        if (items === null || items === undefined || items === false) {
            return [];
        }
        if (typeof items === "string" || typeof items === "number" || items instanceof Node) {
            return [items];
        }
        if (Array.isArray(items)) {
            return items.flatMap(normalizeChildren);
        }
        if (items instanceof NodeList || items instanceof HTMLCollection) {
            return Array.from(items).flatMap(normalizeChildren);
        }
        return [items];
    };

    for (const child of normalizeChildren(children)) {
        if (child === null || child === undefined || child === false) {
            continue;
        }

        if (typeof child === "string" || typeof child === "number") {
            element.appendChild(document.createTextNode(String(child)));
        } else if (child instanceof Node) {
            element.appendChild(child);
        } else {
            console.error("Invalid child passed to createElement:", child);
        }
    }

    return element;
}

export { createElement };
