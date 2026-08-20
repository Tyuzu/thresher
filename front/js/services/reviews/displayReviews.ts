import "../../../css/subpages/reviews.css";
import { Button } from "../../components/base/Button.ts";
import { createElement } from "../../components/createElement.ts";
import { apiFetch } from "../../api/api.ts";
import { handleAddReview, handleEditReview, handleDeleteReview } from "./createReview.ts";
import { fetchUserMeta } from "../../utils/usersMeta.ts";
import Datex from "../../components/base/Datex.ts";

function clearElement(el) {
    while (el.firstChild) {
el.removeChild(el.firstChild);
}
}

function ReviewItem(isCreator, review, reviewerName, onEdit, onDelete) {
    const currentUser = localStorage.getItem("user");
    const isAuthor = review.userid === currentUser;

    let actions = null;
    if (!isCreator && isAuthor) {
        actions = createElement("div", { class: "review-actions" }, [
            Button("Edit", "", { click: onEdit }),
            Button("Delete", "", { click: onDelete })
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

async function displayReviews(reviewsContainer, isCreator, isLoggedIn, entityType, entityId) {
    clearElement(reviewsContainer);

    const title = createElement("h2", {}, ["Reviews"]);
    reviewsContainer.append(title);

    const actionContainer = createElement("div", { class: "review-action-container" });

    if (!isCreator && isLoggedIn) {
        reviewsContainer.append(
            Button("Add Review", "", {
                click: () =>
                    handleAddReview(actionContainer, entityType, entityId, () =>
                        displayReviews(reviewsContainer, isCreator, isLoggedIn, entityType, entityId)
                    )
            })
        );
    }

    reviewsContainer.append(actionContainer);

    let reviews;
    try {
        reviews = await apiFetch(`/reviews/${entityType}/${entityId}`);
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

    const userIds = [...new Set(reviews.map(r => r.userid))];
    const userMeta = await fetchUserMeta(userIds);

    reviews.forEach(review => {
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
