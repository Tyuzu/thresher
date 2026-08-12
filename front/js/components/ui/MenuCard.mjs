import "../../../css/ui/MenuCard.css";
import { createElement } from "../../components/createElement.js"; // Adjust path as needed

const MenuCard = ({ name, price, discount = 0, image, stock, onBuy, onEdit, onDelete, isCreator, isLoggedIn }) => {
  const hasDiscount = Number(discount || 0) > 0;
  const discountedPrice = hasDiscount ? (price * (1 - Number(discount || 0) / 100)) / 100 : price / 100;
  const priceText = hasDiscount ? `Price: ₹${discountedPrice.toFixed(2)}` : `Price: ₹${(price / 100).toFixed(2)}`;

  // Images and details
  const img = createElement("img", {
    src: image,
    alt: name
  });

  const nameElement = createElement("h3", {}, [name]);
  const priceElement = createElement("p", {}, [priceText]);

  const discountElement = hasDiscount
    ? createElement("p", {
        style: {
          color: "#e53935",
          fontWeight: "bold"
        }
      }, [`${discount}% OFF`])
    : null;

  const stockElement = createElement("p", {}, [`Available: ${stock}`]);

  // Action Buttons
  const actionChildren = [];

  if (isCreator) {
    const editButton = createElement("button", {
      class: "buttonx",
      events: { click: onEdit }
    }, ["Edit"]);

    const deleteButton = createElement("button", {
      class: "buttonx",
      events: { click: onDelete }
    }, ["Delete"]);

    actionChildren.push(editButton, deleteButton);
  } else if (isLoggedIn) {
    if (stock > 0) {
      const buyButton = createElement("button", {
        events: { click: () => onBuy() }
      }, ["Buy"]);
      actionChildren.push(buyButton);
    } else {
      const soldOutButton = createElement("button", {
        disabled: true,
        style: {
          backgroundColor: "#ddd",
          color: "#000"
        }
      }, ["Sold Out"]);
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
    actions
  ].filter(Boolean);

  const card = createElement("div", { class: "menu-card" }, cardChildren);

  return card;
};

export default MenuCard;