import "../../../css/inistyles/adminpage.css";
//import { displayAdminDash } from "../../services/admin/adminDash.js";

export async function AdminDash(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  //displayAdminDash(contentContainer, isLoggedIn);
}