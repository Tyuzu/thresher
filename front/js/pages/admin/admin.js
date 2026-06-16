import { displayModerator } from "../../services/admin/modPage.js";
import { loadModeratorApplications, displayUserRoleManager } from "../../services/admin/modapprovals.js";
import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";

async function Admin(isLoggedIn, contentContainer) {
    contentContainer.innerHTML = '';

    if (!isLoggedIn) {
        contentContainer.appendChild(createElement("p", {}, ["Admin access only. Please log in."]));
        return;
    }

    // Create tabs container
    const adminWrapper = createElement("div", { class: "admin-tabs-wrapper", style: "width: 100%;" });

    // Create tabs header
    const tabsHeader = createElement("div", {
        class: "admin-tabs-header",
        style: "display: flex; gap: 10px; border-bottom: 2px solid #e0e0e0; margin-bottom: 20px; padding-bottom: 10px;"
    });

    // Create tab buttons
    const reportedContentBtn = Button("Reported Content", "", {
        click: () => switchTab("reported", contentArea)
    }, "tab-btn");
    reportedContentBtn.style.backgroundColor = "#2196F3";
    reportedContentBtn.style.color = "white";

    const moderatorAppsBtn = Button("Moderator Applications", "", {
        click: () => switchTab("applications", contentArea)
    }, "tab-btn");
    moderatorAppsBtn.style.backgroundColor = "#f5f5f5";
    moderatorAppsBtn.style.color = "#333";

    const userRolesBtn = Button("User Roles", "", {
        click: () => switchTab("roles", contentArea)
    }, "tab-btn");
    userRolesBtn.style.backgroundColor = "#f5f5f5";
    userRolesBtn.style.color = "#333";

    tabsHeader.append(reportedContentBtn, moderatorAppsBtn, userRolesBtn);

    // Create content area
    const contentArea = createElement("div", {
        class: "admin-tabs-content",
        style: "width: 100%;"
    });

    adminWrapper.append(tabsHeader, contentArea);
    contentContainer.appendChild(adminWrapper);

    // Function to switch tabs
    function switchTab(tab, contentArea) {
        // Reset all button styles
        reportedContentBtn.style.backgroundColor = "#f5f5f5";
        reportedContentBtn.style.color = "#333";
        moderatorAppsBtn.style.backgroundColor = "#f5f5f5";
        moderatorAppsBtn.style.color = "#333";
        userRolesBtn.style.backgroundColor = "#f5f5f5";
        userRolesBtn.style.color = "#333";

        // Highlight active tab
        if (tab === "reported") {
            reportedContentBtn.style.backgroundColor = "#2196F3";
            reportedContentBtn.style.color = "white";
            displayModerator(contentArea, isLoggedIn);
        } else if (tab === "applications") {
            moderatorAppsBtn.style.backgroundColor = "#2196F3";
            moderatorAppsBtn.style.color = "white";
            loadModeratorApplications(contentArea);
        } else if (tab === "roles") {
            userRolesBtn.style.backgroundColor = "#2196F3";
            userRolesBtn.style.color = "white";
            displayUserRoleManager(contentArea, isLoggedIn);
        }
    }

    // Load reported content by default
    displayModerator(contentArea, isLoggedIn);
}

export { Admin };
