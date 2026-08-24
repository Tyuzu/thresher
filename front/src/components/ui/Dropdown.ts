import "../../../css/ui/Dropdown.css";

export interface DropdownOption {
  label: string;
  value?: string;
}

export type DropdownItem = string | DropdownOption;

export interface DropdownProps {
  options?: DropdownItem[];
  onChange?: (value: string) => void;
  defaultText?: string;
}

const Dropdown = ({
  options = [],
  onChange = () => {},
  defaultText = "Select an option",
}: DropdownProps = {}): HTMLDivElement => {
  const container = document.createElement("div");
  container.className = "dropdown";

  const button = document.createElement("button");
  button.className = "dropdown-button";
  button.type = "button";
  button.textContent = defaultText;

  const menu = document.createElement("ul");
  menu.className = "dropdown-menu";

  options.forEach((option) => {
    const label = typeof option === "string" ? option : option.label;
    const value = typeof option === "string" ? option : option.value ?? option.label;

    const menuItem = document.createElement("li");
    menuItem.className = "dropdown-item";
    menuItem.textContent = label;

    menuItem.addEventListener("click", (e: MouseEvent) => {
      e.stopPropagation();
      button.textContent = label;
      onChange(value);
      menu.classList.remove("show");
    });

    menu.appendChild(menuItem);
  });

  button.addEventListener("click", (e: MouseEvent) => {
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