// profileUtils.js

import Datex from "../../components/base/Datex";

/* ============================================================
    FORMATTERS & HELPERS
============================================================ */

/**
 * Formats a date string into a Datex component instance or formatted string
 * @param {string|Date} dateString 
 * @returns {HTMLElement|string|null}
 */
export function formatDate(dateString) {
  if (!dateString) return null;
  try {
    return Datex(dateString);
  } catch (error) {
    console.error("Error formatting date with Datex:", error);
    return new Date(dateString).toLocaleString();
  }
}

/**
 * Capitalizes the first letter of a string
 * @param {string} string 
 * @returns {string}
 */
export function capitalize(string = "") {
  if (!string) return "";
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/* ============================================================
    LOADING INDICATORS
============================================================ */

/**
 * Renders a loading message to a target container or default #content element
 * @param {string} message 
 * @param {string} [containerId="content"] 
 */
export function showLoadingMessage(message, containerId = "content") {
  removeLoadingMessage();

  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container #${containerId} not found to show loading message.`);
    return;
  }

  const loadingMsg = document.createElement("p");
  loadingMsg.id = "loading-msg";
  loadingMsg.className = "loading-message";
  loadingMsg.textContent = message;

  container.appendChild(loadingMsg);
}

/**
 * Removes active loading message from the DOM
 */
export function removeLoadingMessage() {
  const loadingMsg = document.getElementById("loading-msg");
  if (loadingMsg) {
    loadingMsg.remove();
  }
}

/* ============================================================
    MEDIA PREVIEWS
============================================================ */

/**
 * Previews an image file selection on a target image element
 * Uses URL.createObjectURL for superior memory management over FileReader
 * @param {Event} event 
 * @param {string} [previewId="profile-picture-preview"] 
 */
export function previewAvatar(event, previewId = "profile-picture-preview") {
  const file = event.target?.files?.[0];
  const preview = document.getElementById(previewId);

  if (!preview) return;

  if (file) {
    // Revoke previous Object URL to prevent memory leaks if re-uploading
    if (preview.dataset.objectUrl) {
      URL.revokeObjectURL(preview.dataset.objectUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    preview.src = objectUrl;
    preview.style.display = "block";
    preview.dataset.objectUrl = objectUrl;
  }
}