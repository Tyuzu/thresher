
import "../../../css/subpages/vendors.css";
import { hireVendors } from "../../services/jobs/vendors/vendors.js";

export async function Vendors(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  await hireVendors(contentContainer, false, isLoggedIn);
}
