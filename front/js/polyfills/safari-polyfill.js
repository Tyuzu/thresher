/**
 * Global Browser Polyfills Module
 * Provides compatibility for missing DOM, Canvas, Animation, and ES6+ features.
 */
(function () {
  "use strict";

  // ============================================================================
  // 1. DOM MATCHES & CLOSEST POLYFILLS
  // ============================================================================

  // Element.prototype.matches (with vendor prefix fallbacks)
  if (!Element.prototype.matches) {
    Element.prototype.matches =
      Element.prototype.webkitMatchesSelector ||
      Element.prototype.msMatchesSelector ||
      function (selector) {
        const matches = (this.document || this.ownerDocument).querySelectorAll(selector);
        let i = matches.length;
        while (--i >= 0 && matches.item(i) !== this) {}
        return i > -1;
      };
  }

  // Element.prototype.closest
  if (!Element.prototype.closest) {
    Element.prototype.closest = function (selector) {
      let el = this;
      while (el && el.nodeType === 1) {
        if (el.matches(selector)) return el;
        el = el.parentElement || el.parentNode;
      }
      return null;
    };
  }

  // ============================================================================
  // 2. DOM MANIPULATION & COLLECTIONS
  // ============================================================================

  // Element.prototype.remove
  if (!Element.prototype.remove) {
    Element.prototype.remove = function () {
      if (this.parentNode) {
        this.parentNode.removeChild(this);
      }
    };
  }

  // Element.prototype.append
  if (!Element.prototype.append) {
    Element.prototype.append = function (...items) {
      items.forEach((item) => {
        this.appendChild(
          item instanceof Node
            ? item
            : document.createTextNode(String(item))
        );
      });
    };
  }

  // NodeList.prototype.forEach
  if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
  }

  // HTMLCollection.prototype.forEach
  if (window.HTMLCollection && !HTMLCollection.prototype.forEach) {
    HTMLCollection.prototype.forEach = Array.prototype.forEach;
  }

  // ============================================================================
  // 3. CANVAS TO BLOB (CRITICAL FOR IMAGE CROPPING & UPLOADS)
  // ============================================================================

  if (!HTMLCanvasElement.prototype.toBlob) {
    Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", {
      value: function (callback, type, quality) {
        const dataURL = this.toDataURL(type, quality);
        const dataParts = dataURL.split(",");
        const mimeString = dataParts[0].split(":")[1].split(";")[0];
        const byteString = atob(dataParts[1]);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);

        for (let i = 0; i < byteString.length; i++) {
          uint8Array[i] = byteString.charCodeAt(i);
        }

        callback(new Blob([arrayBuffer], { type: mimeString }));
      },
      configurable: true,
      writable: true
    });
  }

  // ============================================================================
  // 4. ANIMATION FRAME POLYFILLS
  // ============================================================================

  (function () {
    let lastTime = 0;
    const vendors = ["ms", "moz", "webkit", "o"];

    for (let x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
      window.requestAnimationFrame = window[vendors[x] + "RequestAnimationFrame"];
      window.cancelAnimationFrame =
        window[vendors[x] + "CancelAnimationFrame"] ||
        window[vendors[x] + "CancelRequestAnimationFrame"];
    }

    if (!window.requestAnimationFrame) {
      window.requestAnimationFrame = function (callback) {
        const currTime = Date.now();
        const timeToWait = Math.max(0, 16 - (currTime - lastTime));
        const id = window.setTimeout(() => {
          callback(currTime + timeToWait);
        }, timeToWait);
        lastTime = currTime + timeToWait;
        return id;
      };
    }

    if (!window.cancelAnimationFrame) {
      window.cancelAnimationFrame = function (id) {
        clearTimeout(id);
      };
    }
  })();

  // ============================================================================
  // 5. UTILITY & EVENT POLYFILLS
  // ============================================================================

  // CustomEvent constructor for legacy engines
  if (typeof window.CustomEvent !== "function") {
    function CustomEvent(event, params) {
      params = params || { bubbles: false, cancelable: false, detail: null };
      const evt = document.createEvent("CustomEvent");
      evt.initCustomEvent(
        event,
        params.bubbles,
        params.cancelable,
        params.detail
      );
      return evt;
    }
    CustomEvent.prototype = window.Event.prototype;
    window.CustomEvent = CustomEvent;
  }

  // Object.assign
  if (typeof Object.assign !== "function") {
    Object.defineProperty(Object, "assign", {
      value: function (target, ...sources) {
        if (target === null || target === undefined) {
          throw new TypeError("Cannot convert undefined or null to object");
        }
        const to = Object(target);
        sources.forEach((source) => {
          if (source !== null && source !== undefined) {
            for (const key in source) {
              if (Object.prototype.hasOwnProperty.call(source, key)) {
                to[key] = source[key];
              }
            }
          }
        });
        return to;
      },
      writable: true,
      configurable: true
    });
  }

  // Promise.prototype.finally
  if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
    Promise.prototype.finally = function (callback) {
      const constructor = this.constructor;
      return this.then(
        (value) => constructor.resolve(callback()).then(() => value),
        (reason) =>
          constructor.resolve(callback()).then(() => {
            throw reason;
          })
      );
    };
  }
})();