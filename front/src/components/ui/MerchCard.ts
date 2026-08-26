// MerchCard.ts
import "../../../css/ui/MerchCard.css";
import { createElement } from "../createElement.js";
import Button from "../base/Button.js";
import Sightbox from "./Sightbox_zoom.js";

export interface MerchCardProps {
  name: string;
  price: number;
  discount?: number;
  image: string;
  stock: number;
  onBuy?: (e: Event) => void;
  onEdit?: (e: Event) => void;
  onDelete?: (e: Event) => void;
  onReport?: (e: Event) => void;
  isCreator?: boolean;
  isLoggedIn?: boolean;
  [key: string]: unknown;
}

const MerchCard = ({
  name,
  price,
  discount = 0,
  image,
  stock,
  onBuy,
  onEdit,
  onDelete,
  onReport,
  isCreator = false,
  isLoggedIn = false,
}: MerchCardProps): HTMLElement => {
  const imageElement = createElement("img", {
    class: "merch-image",
    src: image,
    alt: name || "Merch",
    loading: "lazy",
  }) as HTMLImageElement;

  const hasDiscount = Number(discount || 0) > 0;
  const discountedPrice = hasDiscount ? price * (1 - Number(discount || 0) / 100) : price;

  const priceText = hasDiscount
    ? `Price: ₹${(discountedPrice / 100).toFixed(2)}`
    : `Price: ₹${(price / 100).toFixed(2)}`;

  const actions = createElement("div", {
    class: "merch-actions",
  }) as HTMLElement;

  if (isCreator) {
    actions.append(
      Button({
        title: "Edit",
        classes: "buttonx",
        events: {
          click: (e: Event) => onEdit?.(e),
        },
      }),
      Button({
        title: "Delete",
        classes: "delete-btn buttonx",
        events: {
          click: (e: Event) => onDelete?.(e),
        },
      })
    );
  } else if (isLoggedIn) {
    const buyButton =
      stock > 0
        ? Button({
            title: "Buy",
            classes: "buttonx",
            events: {
              click: (e: Event) => onBuy?.(e),
            },
          })
        : Button({
            title: "Sold Out",
            classes: "buttonx",
            disabled: true,
            styles: {
              backgroundColor: "#ddd",
              color: "#000",
            },
          });

    const reportButton = Button({
      title: "Report",
      classes: "buttonx",
      events: {
        click: (e: Event) => onReport?.(e),
      },
    });

    actions.append(buyButton, reportButton);
  }

  imageElement.addEventListener("click", () => Sightbox(image, "image"));

  return createElement("div", { class: "merch-card" }, [
    imageElement,
    createElement("h3", {}, [name]),
    createElement("p", {}, [priceText]),
    hasDiscount
      ? createElement(
          "p",
          {
            style: { color: "#e53935", fontWeight: "bold" },
          },
          [`${discount}% OFF`]
        )
      : null,
    createElement("p", {}, [`Available: ${stock}`]),
    actions,
  ]) as HTMLElement;
};

export default MerchCard;
export { MerchCard as MerchCardComponent };