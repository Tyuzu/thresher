import { setState, getState } from '../../state/state.js';
import { apiFetch } from "../../api/api.js";
import { fetchProfile } from './fetchProfile.js';
import Notify from "../../components/ui/Notify.mjs";

/* ============================================================
    GENERIC TOGGLE ACTION
============================================================ */

/**
 * Optimistically toggles an action state (follow, block, like, etc.) on an entity.
 */
async function toggleAction({
  entityId,
  entityType = "user",
  button,
  apiPath,
  labels = { on: "Active", off: "Inactive" },
  actionName = "action"
}) {
  if (!getState("token")) {
    Notify("Please log in first.", { type: "warning", duration: 3000, dismissible: true });
    return;
  }

  if (!button) {
    Notify("Action button not found.", { type: "info", duration: 3000, dismissible: true });
    return;
  }

  const isActive = button.dataset.active === "true";
  const httpMethod = isActive ? "DELETE" : "PUT";
  const apiEndpoint = `${apiPath}${entityId}`;

  const originalText = button.textContent;
  const wasActive = isActive;

  // Optimistically update UI state
  button.disabled = true;
  button.textContent = isActive ? labels.off : labels.on;
  button.dataset.active = String(!isActive);

  try {
    const response = await apiFetch(apiEndpoint, httpMethod);

    // Support both raw Response objects and parsed JSON payloads
    if (response && typeof response.ok === "boolean" && !response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    button.disabled = false;

    // Refresh user profile state if acting on a user
    if (entityType === "user") {
      const updatedProfile = await fetchProfile();
      if (updatedProfile) {
        setState({ userProfile: updatedProfile }, true);
      }
    }

    const actionText = !wasActive ? actionName : `un${actionName}`;
    Notify(`You have ${actionText} this ${entityType}.`, {
      type: "success",
      duration: 3000,
      dismissible: true
    });
  } catch (error) {
    // Rollback UI to previous state on failure
    button.textContent = originalText;
    button.dataset.active = String(wasActive);
    button.disabled = false;

    console.error(`Error toggling ${actionName}:`, error);
    Notify(`Failed to update ${actionName}: ${error.message || "Unknown error"}`, {
      type: "error",
      duration: 3000,
      dismissible: true
    });
  }
}

/* ============================================================
    SPECIFIC ACTION WRAPPERS
============================================================ */

/**
 * Legacy wrapper for follow/unfollow toggle action
 */
function toggleFollow(userId, followButton) {
  return toggleAction({
    entityId: userId,
    entityType: "user",
    button: followButton,
    apiPath: "/follow/",
    labels: { on: "Unfollow", off: "Follow" },
    actionName: "followed"
  });
}

export { toggleFollow, toggleAction };