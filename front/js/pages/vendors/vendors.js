import { hireVendors } from "../../services/jobs/vendors/vendors.js";

async function Vendors(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = "";
    await hireVendors(contentContainer, isLoggedIn, null);
}

export { Vendors };
