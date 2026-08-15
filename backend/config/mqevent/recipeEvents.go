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

/* ============================================================
   RECIPE CREATED
============================================================ */

type RecipeCreatedPayload struct {
	RecipeID   string    `json:"recipe_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   RECIPE UPDATED
============================================================ */

type RecipeUpdatedPayload struct {
	RecipeID   string    `json:"recipe_id"`
	OccurredAt time.Time `json:"occurred_at"`
}

/* ============================================================
   RECIPE REMOVED
============================================================ */

type RecipeRemovedPayload struct {
	RecipeID   string    `json:"recipe_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
