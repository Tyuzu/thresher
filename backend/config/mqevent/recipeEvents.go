package mqevent

import "time"

/* ============================================================
   RECIPE EVENTS
============================================================ */

const (
	RecipeCreatedEvent = "recipe.created"
	RecipeUpdatedEvent = "recipe.updated"
	RecipeDeletedEvent = "recipe.deleted"
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
   RECIPE DELETED
============================================================ */

type RecipeDeletedPayload struct {
	RecipeID   string    `json:"recipe_id"`
	OccurredAt time.Time `json:"occurred_at"`
}
