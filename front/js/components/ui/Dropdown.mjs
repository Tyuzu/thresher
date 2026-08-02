import "../../../css/ui/Dropdown.css";

const Dropdown = (options = [], onChange = () => {}, defaultText = "Select an option") => {
  const container = document.createElement("div");
  container.className = "dropdown";

  const button = document.createElement("button");
  button.className = "dropdown-button";
  button.type = "button"; // Prevents accidental form submissions if placed in a <form>
  button.textContent = defaultText;

  const menu = document.createElement("ul");
  menu.className = "dropdown-menu";

  options.forEach((option) => {
    const menuItem = document.createElement("li");
    menuItem.className = "dropdown-item";
    menuItem.textContent = option;
    
    menuItem.addEventListener("click", (e) => {
      e.stopPropagation();
      button.textContent = option;
      onChange(option);
      menu.classList.remove("show");
    });
    
    menu.appendChild(menuItem);
  });

  button.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("show");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", () => {
    menu.classList.remove("show");
  });

  container.appendChild(button);
  container.appendChild(menu);

  return container;
};

export default Dropdown;