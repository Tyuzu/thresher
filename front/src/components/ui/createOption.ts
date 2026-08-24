/**
 * Creates an HTMLOptionElement with specified value, label, and selection state.
 *
 * @param value The value attribute for the option
 * @param label The text content displayed for the option
 * @param selected Optional boolean indicating whether the option should be selected
 * @returns HTMLOptionElement
 */
export function createOption(
  value: string,
  label: string,
  selected = false
): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  if (selected) {
    option.selected = true;
  }
  return option;
}