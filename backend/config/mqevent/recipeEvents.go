package mqevent

import "time"

/* ============================================================
   RECIPE EVENTS
============================================================ */

const (
	RecipeCreated = "recipe.created"
	RecipeUpdated = "recipe.updated"
	RecipeRemoved = "recipe.removed"
)

type RecipeCreatedPayload struct {
	RecipeID   string    `json:"recipeid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type RecipeUpdatedPayload struct {
	RecipeID   string    `json:"recipeid"`
	OccurredAt time.Time `json:"occurred_at"`
}

type RecipeDeletedPayload struct {
	RecipeID   string    `json:"recipeid"`
	OccurredAt time.Time `json:"occurred_at"`
}
