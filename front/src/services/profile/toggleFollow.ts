import { setState, getState } from '../../state/state.js';
import { fetchProfile } from './fetchProfile.js';
import { toggleActionRequest } from './api.js';
import Notify from "../../components/ui/Notify.js";

interface ToggleLabels {
  on: string;
  off: string;
}

interface ToggleActionOptions {
  entityId: string | number;
  entityType?: string;
  button: HTMLButtonElement | null;
  apiPath: string;
  labels?: ToggleLabels;
  actionName?: string;
}

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
}: ToggleActionOptions): Promise<void> {
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
    const response = (await toggleActionRequest(apiEndpoint, httpMethod)) as Response | undefined;

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

    const err = error as Error;
    console.error(`Error toggling ${actionName}:`, error);
    Notify(`Failed to update ${actionName}: ${err.message || "Unknown error"}`, {
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
function toggleFollow(userId: string | number, followButton: HTMLButtonElement | null): Promise<void> {
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