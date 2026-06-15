import { apiFetch } from "../../api/api.js";
import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";

/*
  User Role Management Module
  Exports:
    - displayUserRoleManager(container, isLoggedIn)
*/

const ALLOWED_ROLES = ["user", "moderator", "admin"];

export async function displayUserRoleManager(contentx, isLoggedIn) {
    contentx.replaceChildren();
    const container = createElement("div", { class: "user-role-manager" });
    contentx.appendChild(container);

    if (!isLoggedIn) {
        container.appendChild(createElement("p", {}, ["Admin access only. Please log in."]));
        return;
    }

    buildUserRoleUI(container);
}

function buildUserRoleUI(container) {
    container.replaceChildren();

    const header = createElement("div", { class: "role-manager-header" });
    const title = createElement("h2", {}, ["User Role Management"]);
    header.appendChild(title);

    const searchSection = createSearchSection();
    const resultsContainer = createElement("div", { class: "role-results-container" });
    const formContainer = createElement("div", { class: "role-form-container" });

    container.append(header, searchSection.wrapper, resultsContainer, formContainer);

    // Attach search listener
    searchSection.searchInput.addEventListener("input", async (e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
            resultsContainer.replaceChildren();
            formContainer.replaceChildren();
            return;
        }

        resultsContainer.replaceChildren(createElement("div", { class: "spinner" }));
        await searchUsers(query, resultsContainer, formContainer);
    });
}

function createSearchSection() {
    const wrapper = createElement("div", { class: "role-search-section", style: "margin: 20px 0; padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px;" });

    const label = createElement("label", { style: "display: block; margin-bottom: 8px; font-weight: 500;" }, ["Search User by ID or Username:"]);
    const searchInput = createElement("input", {
        type: "text",
        placeholder: "Enter user ID or username...",
        style: "width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;"
    });

    wrapper.append(label, searchInput);
    return { wrapper, searchInput };
}

async function searchUsers(query, resultsContainer, formContainer) {
    try {
        // Search using the autocomplete or user endpoint
        const users = await apiFetch(`/ac/users?q=${encodeURIComponent(query)}`);

        if (!Array.isArray(users) || users.length === 0) {
            resultsContainer.replaceChildren(createElement("p", { style: "color: #999;" }, ["No users found."]));
            formContainer.replaceChildren();
            return;
        }

        displaySearchResults(users, resultsContainer, formContainer);
    } catch (err) {
        console.error("Search failed:", err);
        resultsContainer.replaceChildren(createElement("p", { style: "color: #d32f2f;" }, ["Search failed. Please try again."]));
        formContainer.replaceChildren();
    }
}

function displaySearchResults(users, resultsContainer, formContainer) {
    resultsContainer.replaceChildren();
    const resultsList = createElement("div", { class: "search-results" });

    users.forEach(user => {
        const resultItem = createElement("div", {
            class: "search-result-item",
            style: "padding: 10px; margin: 5px 0; background: #f5f5f5; border-left: 3px solid #2196F3; cursor: pointer; border-radius: 2px;"
        });

        const userInfo = createElement("div", {}, [
            createElement("strong", {}, [user.username || user.userid]),
            createElement("small", { style: "display: block; color: #666; margin-top: 4px;" }, [`ID: ${user.userid}`])
        ]);

        resultItem.appendChild(userInfo);
        resultItem.addEventListener("click", () => {
            displayRoleForm(user, formContainer, resultsContainer);
        });

        resultsList.appendChild(resultItem);
    });

    resultsContainer.appendChild(resultsList);
}

function displayRoleForm(user, formContainer, resultsContainer) {
    formContainer.replaceChildren();

    const form = createElement("div", {
        class: "role-form",
        style: "margin-top: 20px; padding: 15px; border: 1px solid #2196F3; border-radius: 4px; background: #f9f9f9;"
    });

    const title = createElement("h3", {}, [`Set Role for ${user.username || user.userid}`]);

    const roleGroup = createElement("div", { style: "margin: 15px 0;" });
    const roleLabel = createElement("label", { style: "display: block; margin-bottom: 8px; font-weight: 500;" }, ["Select Role:"]);

    const roleSelect = createElement("select", {
        style: "width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;"
    });

    ALLOWED_ROLES.forEach(role => {
        const option = createElement("option", { value: role }, [role.charAt(0).toUpperCase() + role.slice(1)]);
        roleSelect.appendChild(option);
    });

    roleGroup.append(roleLabel, roleSelect);

    const buttonGroup = createElement("div", {
        style: "display: flex; gap: 10px; margin-top: 15px;"
    });

    const submitBtn = Button("Update Role", "", {
        click: async () => {
            await updateUserRole(user.userid, roleSelect.value, formContainer, resultsContainer);
        }
    }, "submit-role-btn");

    const cancelBtn = Button("Cancel", "", {
        click: () => {
            formContainer.replaceChildren();
        }
    }, "cancel-role-btn");

    submitBtn.style.backgroundColor = "#4CAF50";
    submitBtn.style.color = "white";
    cancelBtn.style.backgroundColor = "#f44336";
    cancelBtn.style.color = "white";

    buttonGroup.append(submitBtn, cancelBtn);

    form.append(title, roleGroup, buttonGroup);
    formContainer.appendChild(form);
}

async function updateUserRole(userId, role, formContainer, resultsContainer) {
    try {
        const res = await apiFetch(`/moderator/users/${userId}/role`, "PUT", {
            role: role.toLowerCase()
        });

        const successMsg = createElement("div", {
            class: "success-message",
            style: "padding: 12px; margin-top: 10px; background: #4CAF50; color: white; border-radius: 4px;"
        }, [
            `✓ ${res.message || "Role updated successfully"}`,
            createElement("small", { style: "display: block; margin-top: 4px;" }, [`User: ${res.userId} | New Role: ${res.role}`])
        ]);

        formContainer.replaceChildren(successMsg);

        // Clear results after a short delay
        setTimeout(() => {
            resultsContainer.replaceChildren();
            formContainer.replaceChildren();
        }, 3000);
    } catch (err) {
        console.error("Update failed:", err);
        const errorMsg = createElement("div", {
            class: "error-message",
            style: "padding: 12px; margin-top: 10px; background: #f44336; color: white; border-radius: 4px;"
        }, [
            `✗ ${err.message || "Failed to update role"}`
        ]);

        formContainer.replaceChildren(errorMsg);
    }
}
