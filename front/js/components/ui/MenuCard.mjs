
// Updated MenuCard component
const MenuCard = ({ name, price, discount = 0, image, stock, onBuy, onEdit, onDelete, isCreator, isLoggedIn }) => {
    const card = document.createElement('div');
    card.className = 'menu-card';

    const img = document.createElement('img');
    img.src = image;
    img.alt = name;

    const nameElement = document.createElement('h3');
    nameElement.textContent = name;

    const priceElement = document.createElement('p');
    const hasDiscount = Number(discount || 0) > 0;
    const discountedPrice = hasDiscount ? (price * (1 - Number(discount || 0) / 100)) / 100 : price / 100;
    priceElement.textContent = hasDiscount ? `Price: ₹${discountedPrice.toFixed(2)}` : `Price: ₹${(price / 100).toFixed(2)}`;

    const discountElement = hasDiscount ? document.createElement('p') : null;
    if (discountElement) {
        discountElement.textContent = `${discount}% OFF`;
        discountElement.style.color = '#e53935';
        discountElement.style.fontWeight = 'bold';
    }

    const stockElement = document.createElement('p');
    stockElement.textContent = `Available: ${stock}`;

    const actions = document.createElement('div');
    actions.className = 'menu-actions';

    if (isCreator) {
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', onEdit);
        editButton.className = "buttonx";

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', onDelete);
        deleteButton.className = "buttonx";

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);
    } else if (isLoggedIn) {
        const buyButton = document.createElement('button');
        if (stock > 0) {
            buyButton.textContent = 'Buy';
            buyButton.addEventListener('click', () => onBuy());
        } else {
            buyButton.textContent = 'Sold Out';
            buyButton.style.backgroundColor = '#ddd';
            buyButton.style.color = '#000';
            buyButton.disabled = true;
        }

        actions.appendChild(buyButton);
    }

    card.appendChild(img);
    card.appendChild(nameElement);
    card.appendChild(priceElement);
    if (discountElement) {
card.appendChild(discountElement);
}
    card.appendChild(stockElement);
    card.appendChild(actions);

    return card;
};

export default MenuCard;
