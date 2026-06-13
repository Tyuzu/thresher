import "../../../css/ui/MerchCard.css";
import { createElement } from "../createElement.js";
import Sightbox from "./Sightbox_zoom.mjs";

const MerchCard = ({
    name,
    price,
    image,
    stock,
    onBuy,
    onEdit,
    onDelete,
    onReport,
    isCreator,
    isLoggedIn,
}) => {
    const imageElement = createElement("img", {
        class: "merch-image",
        src: image,
        alt: name || "Merch",
        loading: "lazy",
    });

    const actions = createElement("div", {
        class: "merch-actions",
    });

    if (isCreator) {
        actions.append(
            createElement("button", {
                class: "buttonx",
                textContent: "Edit",
                events: {
                    click: onEdit,
                },
            }),
            createElement("button", {
                class: "delete-btn buttonx",
                textContent: "Delete",
                events: {
                    click: onDelete,
                },
            })
        );
    } else if (isLoggedIn) {
        const buyButton =
            stock > 0
                ? createElement("button", {
                    class: "buttonx",
                    textContent: "Buy",
                    events: {
                        click: onBuy,
                    },
                })
                : createElement("button", {
                    class: "buttonx",
                    textContent: "Sold Out",
                    disabled: true,
                    style: {
                        backgroundColor: "#ddd",
                        color: "#000",
                    },
                });

        const reportButton = createElement("button", {
            class: "buttonx",
            textContent: "Report",
            events: {
                click: onReport,
            },
        });

        actions.append(buyButton, reportButton);
    }

    imageElement.addEventListener("click", () => Sightbox(image, "image"));

    return createElement(
        "div",
        { class: "merch-card" },
        [
            imageElement,
            createElement("h3", { textContent: name }),
            createElement("p", {
                textContent: `Price: $${(price / 100).toFixed(2)}`,
            }),
            createElement("p", {
                textContent: `Available: ${stock}`,
            }),
            actions,
        ]
    );
};

export default MerchCard;