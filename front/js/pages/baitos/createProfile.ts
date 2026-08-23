
import { displayCreateBaitoProfile } from "../../services/baitos/create/createBaitoProfile.js";

export async function CreateBaitoProfile(
  isLoggedIn: boolean,
  contentContainer: HTMLElement
): Promise<void> {
  contentContainer.innerHTML = "";
  displayCreateBaitoProfile(isLoggedIn, contentContainer);
}
