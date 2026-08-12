import "../../../css/ui/TicketCard1.css";
import { createElement } from "../../components/createElement.js"; // Adjust path as needed
import { applyButtonColors } from "../../utils/lumicolor.js";
import Button from "../base/Button.js";

const TicketCard = ({ isl, seatstart, seatend, creator, name, price, quantity, color, attributes = {}, onClick }) => {
  // Folded corner
  const corner = createElement("div", {
    class: "corner",
    style: { borderTop: `40px solid ${color}` }
  });

  // Left color stripe with perforation
  const perforation = createElement("div", { class: "perforation" });
  const stripeContainer = createElement("div", {
    class: "stripe-container",
    style: { backgroundColor: color }
  }, [perforation]);

  // Main content elements
  const nameElement = createElement("h2", {
    style: { color }
  }, [name]);

  const contentChildren = [nameElement];

  if (seatstart && seatend) {
    const seats = createElement("p", {}, [`Seats: ${seatstart} - ${seatend}`]);
    contentChildren.push(seats);
  }

  const priceElement = createElement("span", {}, [`Price: ${price}`]);
  const availableElement = createElement("span", {}, [`Available: ${quantity}`]);

  const info = createElement("div", { class: "tickinfo" }, [
    priceElement,
    availableElement
  ]);

  contentChildren.push(info);

  // Buy button
  if (!creator && isl) {
    const button = Button("Buy Ticket", "", {}, "buttonx primary");
    if (quantity > 0) {
      button.textContent = "Buy Ticket";
      button.addEventListener("click", () => onClick(name, quantity));
      applyButtonColors(button, color);
    } else {
      button.textContent = "Sold Out";
      Object.assign(button.style, { backgroundColor: "#ddd", color: "#000" });
      button.disabled = true;
    }
    contentChildren.push(button);
  }

  const content = createElement("div", { class: "content" }, contentChildren);

  // Root card element merging dynamic custom attributes
  const card = createElement("div", {
    class: "ticket-card",
    ...attributes
  }, [corner, stripeContainer, content]);

  return card;
};

export default TicketCard;