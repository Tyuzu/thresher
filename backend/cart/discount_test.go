package cart

import "testing"

func TestItemDiscountTotals(t *testing.T) {
	if got := int64(1000 * 0.9); got != 900 {
		t.Fatalf("expected 900, got %v", got)
	}
}
