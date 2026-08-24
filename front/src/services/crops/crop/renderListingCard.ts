import { createElement } from "../../../components/createElement";
import Button from "../../../components/base/Button";
import { navigate } from "../../../routes/navigate";
import { addToCart, isValidCartQuantity } from "../../cart/addToCart";
import { getState } from "../../../state/state";

// --- Types & Interfaces ---

export interface CropListingItem {
  cropid: string;
  farmid: string;
  farmName?: string;
  location?: string;
  breed?: string;
  pricePerKg?: number;
  [key: string]: unknown;
}

const MAX_QUANTITY = 99;

/**
 * Renders a listing card with reactive quantity control and cart action.
 */
export function renderListingCard(listing: CropListingItem): HTMLElement {
  let quantity = 1;
  let isAddingToCart = false;

  // 1. Quantity Displays & Controls
  const quantityDisplay = createElement(
    "span",
    {
      class: "quantity-value",
      "aria-live": "polite",
      "aria-label": "Selected quantity"
    },
    [String(quantity)]
  ) as HTMLElement;

  const updateQuantity = (): void => {
    quantityDisplay.textContent = String(quantity);
  };

  const decrementBtn = createElement(
    "button",
    {
      type: "button",
      "aria-label": "Decrease quantity",
      events: {
        click: (): void => {
          if (isAddingToCart) return;
          if (quantity > 1) {
            quantity -= 1;
            updateQuantity();
          }
        }
      }
    },
    ["−"]
  ) as HTMLButtonElement;

  const incrementBtn = createElement(
    "button",
    {
      type: "button",
      "aria-label": "Increase quantity",
      events: {
        click: (): void => {
          if (isAddingToCart) return;
          if (quantity < MAX_QUANTITY) {
            quantity += 1;
            updateQuantity();
          }
        }
      }
    },
    ["+"]
  ) as HTMLButtonElement;

  const quantityWrapper = createElement(
    "div",
    {
      class: "quantity-control",
      role: "group",
      "aria-label": "Quantity"
    },
    [decrementBtn, quantityDisplay, incrementBtn]
  );
  // 2. Navigation Elements
  const farmUrl = `/farm/${listing.farmid}`;
  const farmLink = createElement(
    "a",
    {
      href: farmUrl,
      events: {
        click: (event: Event): void => {
          event.preventDefault();
          navigate(farmUrl);
        }
      }
    },
    [listing.farmName ?? "Unknown farm"]
  );

  // 3. Cart Handler
  const handleAddToCart = async (): Promise<void> => {
    if (isAddingToCart) return;

    if (!isValidCartQuantity(quantity)) {
      console.error("Invalid cart quantity:", quantity);
      return;
    }

    const isLoggedIn = Boolean(getState("token"));
    isAddingToCart = true;

    decrementBtn.disabled = true;
    incrementBtn.disabled = true;

    try {
      const success = await addToCart({
        itemId: listing.cropid,
        quantity,
        isLoggedIn,
        onCartUpdated: (response: unknown): void => {
          console.debug("Cart updated:", response);
        }
      });

      if (!success) return;
    } catch (error: unknown) {
      console.error("Failed to add item to cart:", error);
    } finally {
      isAddingToCart = false;
      decrementBtn.disabled = false;
      incrementBtn.disabled = false;
    }
  };

  // 4. Integrated Button Component
  const addToCartButton = Button({
    title: "Add To Cart",
    id: "a2c-crop",
    events: { click: handleAddToCart },
    classes: "buttonx"
  });

  // 5. Structure Assembly
  return createElement(
    "div",
    { class: "listing-card" },
    [
      farmLink,
      createElement("p", {}, [`Location: ${listing.location ?? "N/A"}`]),
      createElement("p", {}, [`Breed: ${listing.breed ?? "N/A"}`]),
      createElement("p", {}, [
        `Price: ₹${listing.pricePerKg !== undefined ? listing.pricePerKg.toLocaleString("en-IN") : "N/A"} per kg`
      ]),
      createElement("label", {}, ["Quantity (kg):"]),
      quantityWrapper,
      addToCartButton
    ]
  ) as HTMLElement;
}

export default renderListingCard;