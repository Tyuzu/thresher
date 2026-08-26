import { getState } from "../../state/state.js";
import { createElement } from "../../components/createElement.js";
import Modal from "../../components/ui/Modal.js";
import Notify from "../../components/ui/Notify.js";
import Button from "../../components/base/Button.js";
import { submitAppeal, submitReport, type ApiResponse } from "./api.js";

export type TargetType = "post" | "comment" | "user" | "item" | string;

export interface ReportReasonOption {
  value: string;
  label: string;
}

export interface ApiError extends Error {
  status?: number;
}

const REPORT_REASONS: ReportReasonOption[] = [
  { value: "", label: "Select a reason…" },
  { value: "Spam", label: "Spam" },
  { value: "Harassment", label: "Harassment" },
  { value: "Inappropriate", label: "Inappropriate" },
  { value: "Other", label: "Other" }
];

/**
 * Safely checks or writes to localStorage (handles Incognito / restricted storage)
 */
function isAlreadyReportedLocally(userId: string, targetType: string, targetId: string): boolean {
  try {
    return Boolean(localStorage.getItem(`reported:${userId}:${targetType}:${targetId}`));
  } catch {
    return false;
  }
}

function setReportedLocally(userId: string, targetType: string, targetId: string): void {
  try {
    localStorage.setItem(`reported:${userId}:${targetType}:${targetId}`, "1");
  } catch {
    // Ignore storage quota/security errors
  }
}

/**
 * Opens a modal to submit a content report.
 */
export function reportEntity(
  targetId: string,
  targetType: TargetType,
  parentType = "",
  parentId = ""
): void {
  const user = getState("user") as { userid?: string } | undefined;
  const userId = user?.userid;

  if (!userId) {
    Notify("You must be logged in to report content.", { type: "error" });
    return;
  }

  if (isAlreadyReportedLocally(userId, targetType, targetId)) {
    Notify("You already reported this item.", { type: "info" });
    return;
  }

  const content = createElement("div", { class: "vflex report-modal-content" });

  const reasonLabel = createElement("label", { for: "report-reason" }, ["Reason"]);
  const reasonSelect = createElement(
    "select",
    { id: "report-reason", class: "input-select" },
    REPORT_REASONS.map((opt) =>
      createElement("option", { value: opt.value }, [opt.label])
    )
  ) as HTMLSelectElement;

  const notesLabel = createElement("label", { for: "report-notes" }, ["Notes (optional)"]);
  const notesTextarea = createElement(
    "textarea",
    { id: "report-notes", class: "input-textarea", rows: "4", placeholder: "Add details if needed…" },
    []
  ) as HTMLTextAreaElement;

  const messageP = createElement("p", {
    class: "error-message",
    style: { color: "#c00", fontSize: "0.85rem", minHeight: "1.2em", margin: "0.5rem 0" }
  }) as HTMLParagraphElement;

  let submitBtnNode: HTMLElement;
  let cancelBtnNode: HTMLElement;

  const { close } = Modal({
    title: "Report Content",
    content
  });

  submitBtnNode = Button({
    title: "Submit",
    type: "button",
    disabled: true,
    classes: "button-primary"
  });

  cancelBtnNode = Button({
    title: "Cancel",
    type: "button",
    classes: "button-secondary",
    events: { click: close }
  });

  const actionsRow = createElement(
    "div",
    { class: "hflex modal-actions", style: { display: "flex", gap: "0.5rem", marginTop: "1rem" } },
    [cancelBtnNode, submitBtnNode]
  );

  content.append(
    reasonLabel,
    reasonSelect,
    notesLabel,
    notesTextarea,
    messageP,
    actionsRow
  );

  reasonSelect.addEventListener("change", () => {
    (submitBtnNode as HTMLButtonElement).disabled = !reasonSelect.value;
  });

  submitBtnNode.addEventListener("click", async () => {
    const submitBtn = submitBtnNode as HTMLButtonElement;
    const cancelBtn = cancelBtnNode as HTMLButtonElement;

    submitBtn.disabled = true;
    cancelBtn.disabled = true;
    submitBtn.textContent = "Submitting…";
    messageP.textContent = "";

    const payload = {
      targetId,
      targetType,
      parentType,
      parentId,
      reason: reasonSelect.value,
      notes: notesTextarea.value.trim()
    };

    try {
      const res = await submitReport(payload);

      if (res?.reportId) {
        setReportedLocally(userId, targetType, targetId);
        close();
        Notify("Report submitted. Thank you.", { type: "success" });
        return;
      }

      messageP.textContent = res?.error || "Failed to submit report.";
    } catch (err) {
      const error = err as ApiError;
      if (error?.status === 409) {
        setReportedLocally(userId, targetType, targetId);
        close();
        Notify("You already reported this item.", { type: "info" });
        return;
      }
      messageP.textContent = "Network error. Try again.";
    } finally {
      submitBtn.disabled = !reasonSelect.value;
      cancelBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
  });
}

/**
 * Opens a modal to submit a content appeal.
 */
export function appealContent(targetId: string, targetType: TargetType): void {
  const user = getState("user") as { userid?: string } | undefined;
  const userId = user?.userid;

  if (!userId) {
    Notify("You must be logged in to submit an appeal.", { type: "error" });
    return;
  }

  const content = createElement("div", { class: "vflex appeal-modal-content" });

  const info = createElement("p", {}, ["Explain why this content should be restored."]);

  const textarea = createElement(
    "textarea",
    { id: "appeal-notes", class: "input-textarea", rows: "5", placeholder: "Your explanation…" },
    []
  ) as HTMLTextAreaElement;

  const messageP = createElement("p", {
    class: "error-message",
    style: { color: "#c00", fontSize: "0.85rem", minHeight: "1.2em", margin: "0.5rem 0" }
  }) as HTMLParagraphElement;

  let submitBtnNode: HTMLElement;
  let cancelBtnNode: HTMLElement;

  const { close } = Modal({
    title: "Submit Appeal",
    content
  });

  submitBtnNode = Button({
    title: "Submit Appeal",
    type: "button",
    disabled: true,
    classes: "button-primary"
  });

  cancelBtnNode = Button({
    title: "Cancel",
    type: "button",
    classes: "button-secondary",
    events: { click: close }
  });

  const actionsRow = createElement(
    "div",
    { class: "hflex modal-actions", style: { display: "flex", gap: "0.5rem", marginTop: "1rem" } },
    [cancelBtnNode, submitBtnNode]
  );

  content.append(info, textarea, messageP, actionsRow);

  textarea.addEventListener("input", () => {
    (submitBtnNode as HTMLButtonElement).disabled = textarea.value.trim().length < 10;
  });

  submitBtnNode.addEventListener("click", async () => {
    const submitBtn = submitBtnNode as HTMLButtonElement;
    const cancelBtn = cancelBtnNode as HTMLButtonElement;

    submitBtn.disabled = true;
    cancelBtn.disabled = true;
    submitBtn.textContent = "Submitting…";
    messageP.textContent = "";

    try {
      const res = await submitAppeal({
        targetId,
        targetType,
        reason: textarea.value.trim()
      });

      if (res?.appealId) {
        close();
        Notify("Appeal submitted for review.", { type: "success" });
        return;
      }

      messageP.textContent = res?.error || "Failed to submit appeal.";
    } catch (err) {
      const error = err as ApiError;
      if (error?.status === 409) {
        messageP.textContent = "You already have a pending appeal.";
      } else {
        messageP.textContent = "Network error. Try again.";
      }
    } finally {
      submitBtn.disabled = textarea.value.trim().length < 10;
      cancelBtn.disabled = false;
      submitBtn.textContent = "Submit Appeal";
    }
  });
}