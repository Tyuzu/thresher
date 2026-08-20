// renderListingCard.js
import { createElement } from "../../../components/createElement";
import Button from "../../../components/base/Button";
import { navigate } from "../../../routes";
import { addToCart, isValidCartQuantity } from "../../cart/addToCart.ts";
import { getState } from "../../../state/state.ts";
const MAX_QUANTITY = 99;
export function renderListingCard(listing) {
  let quantity = 1;
  let isAddingToCart = false;
  const quantityDisplay = createElement("span", {
    class: "quantity-value",
    "aria-live": "polite",
    "aria-label": "Selected quantity"
  },
    [String(quantity)]);
  const updateQuantity = () => {
    quantityDisplay.textContent = String(quantity);
  };
  const decrementBtn = createElement("button", {
    type: "button",
    "aria-label": "Decrease quantity",
    events: {
      click: () => {
        if (isAddingToCart) {
          return;
        }
        if (quantity > 1) {
          quantity -= 1;
          updateQuantity();
        }
      }
    }
  },
    ["−"]);
  const incrementBtn = createElement("button", {
    type: "button",
    "aria-label": "Increase quantity",
    events: {
      click: () => {
        if (isAddingToCart) {
          return;
        }
        if (quantity < MAX_QUANTITY) {
          quantity += 1;
          updateQuantity();
        }
      }
    }
  },
    ["+"]);
  const quantityWrapper = createElement("div", {
    class: "quantity-control",
    role: "group",
    "aria-label": "Quantity"
  },
    [
      decrementBtn,
      quantityDisplay,
      incrementBtn
    ]);
  const farmUrl = `/farm/${listing.farmid}`;
  const farmLink = createElement("a", {
    href: farmUrl,
    events: {
      click: (event) => {
        event.preventDefault();
        navigate(farmUrl);
      }
    }
  },
    [listing.farmName ?? "Unknown farm"]);
  /**
   * Handle the cart mutation.
   *
   * The cart API now only needs:
   *   - itemId
   *   - quantity
   *
   * Do NOT send:
   *   - itemType
   *   - entityType
   *   - entityId
   *   - category
   *   - itemName
   *   - entityName
   *
   * The backend should resolve those from the canonical item ID.
   */
  const handleAddToCart = async () => {
    /**
     * Prevent accidental double-clicks while the request is active.
     */
    if (isAddingToCart) {
      return;
    }
    /**
     * Validate the quantity before making the request.
     *
     * This is a UX check only. The backend must validate it again.
     */
    if (!isValidCartQuantity(quantity)) {
      console.error("Invalid cart quantity:", quantity);
      return;
    }
    /**
     * The token is only a client-side UX hint.
     *
     * It is NOT a security mechanism.
     * The backend must authenticate the actual request.
     */
    const isLoggedIn = Boolean(getState("token"));
    isAddingToCart = true;
    /**
     * Disable the quantity controls while the mutation is in flight.
     *
     * Native disabled properties prevent further user interaction.
     */
    decrementBtn.disabled = true;
    incrementBtn.disabled = true;
    try {
      const success = await addToCart({
        itemId: listing.cropid,
        quantity,
        isLoggedIn,
        /**
         * This callback runs only after the backend confirms success.
         *
         * Keep it lightweight. Global cart synchronization is already
         * handled by addToCart().
         */
        onCartUpdated: (response) => {
          console.debug("Cart updated:", response);
        }
      });
      /**
       * addToCart() returns false for handled failures.
       * It normally does not throw, but keeping this check makes
       * the component resilient if its implementation changes.
       */
      if (!success) {
        return;
      }
      /**
       * At this point the server has accepted the mutation.
       *
       * We intentionally do NOT reset quantity automatically.
       * Users often want to add the same item again, and preserving
       * their selected quantity is less surprising.
       */
    } catch (error) {
      /**
       * Defensive catch in case addToCart() itself unexpectedly throws.
       */
      console.error("Failed to add item to cart:", error);
    } finally {
      isAddingToCart = false;
      decrementBtn.disabled = false;
      incrementBtn.disabled = false;
    }
  };
  const addToCartButton = Button("Add-To-Cart", "a2c-crop", {
    click: handleAddToCart
  }, "buttonx");
  return createElement("div", {
    class: "listing-card"
  },
    [
      farmLink,
      createElement("p", {},
        [`Location: ${listing.location ?? "N/A"}`]),
      createElement("p", {},
        [`Breed: ${listing.breed ?? "N/A"}`]),
      createElement("p", {},
        [`Price: ₹${listing.pricePerKg ?? "N/A"} per kg`]),
      createElement("label", {},
        ["Quantity (kg):"]),
      quantityWrapper,
      addToCartButton
    ]);
}