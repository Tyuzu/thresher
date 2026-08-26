import "../../../css/subpages/reviews.css";
import { createElement } from "../../components/createElement.js";
import { createFormGroup } from "../../components/form/createFormGroupEnhanced.js";
import Button from "../../components/base/Button.js";
import { createReviewRequest, updateReviewRequest, deleteReviewRequest } from "./api.js";
import type { Review, OnDoneCallback } from "./reviewTypes.js";

function handleAddReview(
  container: HTMLElement,
  entityType: string,
  entityId: string | number,
  onDone: OnDoneCallback
): void {
  container.replaceChildren();

  const form = createElement("form", { class: "review-form" }) as HTMLFormElement;

  const ratingGroup = createFormGroup({
    type: "number",
    id: "rating",
    label: "Rating (1–5)",
    required: true,
    additionalProps: { min: 1, max: 5 }
  });

  const commentGroup = createFormGroup({
    type: "textarea",
    id: "comment",
    label: "Your review",
    required: true,
    additionalProps: { rows: 3 }
  });

  const submitBtn = Button({ title: "Submit", type: "submit" });
  const cancelBtn = Button({
    title: "Cancel",
    type: "button",
    events: { click: () => container.replaceChildren() }
  });

  form.append(ratingGroup, commentGroup, submitBtn, cancelBtn);
  container.append(form);

  form.addEventListener("submit", async (e: SubmitEvent) => {
    e.preventDefault();

    const ratingInput = form.querySelector("#rating") as HTMLInputElement | null;
    const commentInput = form.querySelector("#comment") as HTMLTextAreaElement | null;

    const rating = Number(ratingInput?.value);
    const comment = commentInput?.value.trim() || "";

    if (rating < 1 || rating > 5 || !comment) {
      alert("Invalid rating or empty comment.");
      return;
    }

    try {
      await createReviewRequest(entityType, entityId, { rating, comment });
      container.replaceChildren();
      onDone();
    } catch (err: any) {
      alert(err?.error || "You already reviewed this item.");
    }
  });
}

function handleEditReview(
  review: Review,
  entityType: string,
  entityId: string | number,
  onDone: OnDoneCallback
): void {
  const container = review.__container;
  if (!container) return;

  container.replaceChildren();

  const form = createElement("form", { class: "review-form" }) as HTMLFormElement;

  const ratingGroup = createFormGroup({
    type: "number",
    id: "rating",
    label: "Rating (1–5)",
    required: true,
    value: review.rating,
    additionalProps: { min: 1, max: 5 }
  });

  const commentGroup = createFormGroup({
    type: "textarea",
    id: "comment",
    label: "Your review",
    required: true,
    value: review.comment,
    additionalProps: { rows: 3 }
  });

  const submitBtn = Button({ title: "Save", type: "submit" });
  const cancelBtn = Button({
    title: "Cancel",
    type: "button",
    events: { click: onDone }
  });

  form.append(ratingGroup, commentGroup, submitBtn, cancelBtn);
  container.append(form);

  form.addEventListener("submit", async (e: SubmitEvent) => {
    e.preventDefault();

    const ratingInput = form.querySelector("#rating") as HTMLInputElement | null;
    const commentInput = form.querySelector("#comment") as HTMLTextAreaElement | null;

    const rating = Number(ratingInput?.value);
    const comment = commentInput?.value.trim() || "";

    if (rating < 1 || rating > 5 || !comment) {
      alert("Invalid input.");
      return;
    }

    await updateReviewRequest(entityType, entityId, review.reviewid, {
      rating,
      comment
    });

    onDone();
  });
}

async function handleDeleteReview(
  reviewId: string | number,
  entityType: string,
  entityId: string | number,
  onDone: OnDoneCallback
): Promise<void> {
  if (!confirm("Delete this review?")) {
    return;
  }

  await deleteReviewRequest(entityType, entityId, reviewId);
  onDone();
}

export { handleAddReview, handleEditReview, handleDeleteReview };