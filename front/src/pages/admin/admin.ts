import "../../../css/inistyles/adminpage.css";
//import { displayModerator } from "../../services/admin/modPage.js";

export async function Admin(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  //displayModerator(contentContainer, isLoggedIn);
}