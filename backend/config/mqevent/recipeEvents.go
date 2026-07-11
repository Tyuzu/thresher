package mqevent

import "time"

/* ============================================================
   RECIPE EVENTS
============================================================ */

const (
	RecipeCreatedEvent = "recipe.created"
	RecipeUpdatedEvent = "recipe.updated"
	RecipeRemovedEvent = "recipe.removed"
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
