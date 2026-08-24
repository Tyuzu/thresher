import "../../../css/ui/MenuCard.css";
import { createElement } from "../../components/createElement.js";
import Button from "../base/Button.js";

export interface MenuCardProps {
  name: string;
  price: number;
  discount?: number;
  image: string;
  stock: number;
  onBuy?: (e?: Event) => void;
  onEdit?: (e?: Event) => void;
  onDelete?: (e?: Event) => void;
  isCreator?: boolean;
  isLoggedIn?: boolean;
}

const MenuCard = ({
  name,
  price,
  discount = 0,
  image,
  stock,
  onBuy,
  onEdit,
  onDelete,
  isCreator = false,
  isLoggedIn = false,
}: MenuCardProps): HTMLElement => {
  const hasDiscount = Number(discount || 0) > 0;
  const discountedPrice = hasDiscount ? (price * (1 - Number(discount || 0) / 100)) / 100 : price / 100;
  const priceText = hasDiscount ? `Price: ₹${discountedPrice.toFixed(2)}` : `Price: ₹${(price / 100).toFixed(2)}`;

  // Images and details
  const img = createElement("img", {
    src: image,
    alt: name,
  }) as HTMLImageElement;

  const nameElement = createElement("h3", {}, [name]);
  const priceElement = createElement("p", {}, [priceText]);

  const discountElement = hasDiscount
    ? createElement(
        "p",
        {
          style: {
            color: "#e53935",
            fontWeight: "bold",
          },
        },
        [`${discount}% OFF`]
      )
    : null;

  const stockElement = createElement("p", {}, [`Available: ${stock}`]);

  // Action Buttons
  const actionChildren: HTMLElement[] = [];

  if (isCreator) {
    const editButton = Button({
      title: "Edit",
      classes: "buttonx",
      events: {
        click: (e: Event) => onEdit?.(e),
      },
    });

    const deleteButton = Button({
      title: "Delete",
      classes: "buttonx",
      events: {
        click: (e: Event) => onDelete?.(e),
      },
    });

    actionChildren.push(editButton, deleteButton);
  } else if (isLoggedIn) {
    if (stock > 0) {
      const buyButton = Button({
        title: "Buy",
        classes: "buttonx",
        events: {
          click: (e: Event) => onBuy?.(e),
        },
      });
      actionChildren.push(buyButton);
    } else {
      const soldOutButton = Button({
        title: "Sold Out",
        classes: "buttonx",
        disabled: true,
        styles: {
          backgroundColor: "#ddd",
          color: "#000",
        },
      });
      actionChildren.push(soldOutButton);
    }
  }

  const actions = createElement("div", { class: "menu-actions" }, actionChildren);

  // Filter out null elements (like optional discount element)
  const cardChildren = [
    img,
    nameElement,
    priceElement,
    discountElement,
    stockElement,
    actions,
  ].filter((child): child is HTMLDivElement => child !== null);

  const card = createElement("div", { class: "menu-card" }, cardChildren) as HTMLElement;

  return card;
};

export default MenuCard;