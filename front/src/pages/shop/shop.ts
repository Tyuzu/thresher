
export async function Shop(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  try {
    // The shopping module is optional; suppress TS check for dynamic import
    // @ts-ignore
    const mod = await import("../../services/shopping/shopping.js");
    if (mod && typeof mod.displayShopping === "function") {
      await mod.displayShopping(isLoggedIn, contentContainer);
      return;
    }
  } catch (e) {
    // fallthrough to placeholder
  }
  contentContainer.appendChild(document.createElement("div"));
}
