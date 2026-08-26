import "../../../css/subpages/reviews.css";
import { Button } from "../../components/base/Button.js";
import { createElement } from "../../components/createElement.js";
import { fetchReviews } from "./api.js";
import { handleAddReview, handleEditReview, handleDeleteReview } from "./createReview.js";
import { fetchUserMeta } from "../../utils/usersMeta.js";
import Datex from "../../components/base/Datex.js";
import type { Review, UserMetaMap } from "./reviewTypes.js";

function clearElement(el: HTMLElement): void {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

function ReviewItem(
  isCreator: boolean,
  review: Review,
  reviewerName: string,
  onEdit: () => void,
  onDelete: () => void
): HTMLElement {
  const currentUser = localStorage.getItem("user");
  const isAuthor = review.userid === currentUser;

  let actions: HTMLElement | null = null;
  if (!isCreator && isAuthor) {
    actions = createElement("div", { class: "review-actions" }, [
      Button({ title: "Edit", events: { click: onEdit } }),
      Button({ title: "Delete", events: { click: onDelete } })
    ]);
  }

  return createElement("div", { class: "review-item" }, [
    createElement("div", { class: "review-header" }, [
      createElement("strong", {}, [reviewerName || "Anonymous"]),
      createElement("span", { class: "review-date" }, [
        review.createdAt ? Datex(review.createdAt) : ""
      ])
    ]),
    createElement("p", {}, [`Rating: ${review.rating}/5`]),
    createElement("p", {}, [review.comment]),
    ...(actions ? [actions] : [])
  ]);
}

async function displayReviews(
  reviewsContainer: HTMLElement,
  isCreator: boolean,
  isLoggedIn: boolean,
  entityType: string,
  entityId: string | number
): Promise<void> {
  clearElement(reviewsContainer);

  const title = createElement("h2", {}, ["Reviews"]);
  reviewsContainer.append(title);

  const actionContainer = createElement("div", { class: "review-action-container" });

  if (!isCreator && isLoggedIn) {
    reviewsContainer.append(
      Button({
        title: "Add Review",
        events: {
          click: () =>
            handleAddReview(actionContainer, entityType, entityId, () =>
              displayReviews(reviewsContainer, isCreator, isLoggedIn, entityType, entityId)
            )
        }
      })
    );
  }

  reviewsContainer.append(actionContainer);

  let reviews: Review[];
  try {
    reviews = await fetchReviews(entityType, entityId);
  } catch {
    reviewsContainer.append(
      createElement("p", { class: "error-message" }, ["Failed to load reviews."])
    );
    return;
  }

  if (!Array.isArray(reviews) || reviews.length === 0) {
    reviewsContainer.append(
      createElement("p", { class: "no-reviews" }, ["No reviews yet."])
    );
    return;
  }

  const userIds = [...new Set(reviews.map((r) => r.userid))];
  const userMeta: UserMetaMap = await fetchUserMeta(userIds);

  reviews.forEach((review) => {
    const reviewerName = userMeta[review.userid]?.username || "Anonymous";

    reviewsContainer.append(
      ReviewItem(
        isCreator,
        review,
        reviewerName,
        () =>
          handleEditReview(
            review,
            entityType,
            entityId,
            () =>
              displayReviews(reviewsContainer, isCreator, isLoggedIn, entityType, entityId)
          ),
        () =>
          handleDeleteReview(
            review.reviewid,
            entityType,
            entityId,
            () =>
              displayReviews(reviewsContainer, isCreator, isLoggedIn, entityType, entityId)
          )
      )
    );
  });
}

export { displayReviews };