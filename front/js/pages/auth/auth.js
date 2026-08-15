import "../../../css/inistyles/authpage.css";
import { login, signup } from "../../services/auth/authService.js";
import { createElement } from "../../components/createElement.js";
import { navigate } from "../../routes/index.js";
import { getState } from "../../state/state.js";
import Notify from "../../components/ui/Notify.mjs";

export function Auth(isL, contentContainer) {
    const isAuthenticated = isL || Boolean(getState("token") || localStorage.getItem("token"));

    if (isAuthenticated) {
        navigate("/");
        return;
    }

    if (!contentContainer) return;
    contentContainer.replaceChildren();

    let isLoginView = true;

    const wrapper = createElement("div", { class: "auth-wrapper" }, []);
    const authBox = createElement("div", { class: "auth-box" }, []);

    function renderView() {
        authBox.replaceChildren();
        const form = isLoginView ? createLoginForm(toggleView) : createSignupForm(toggleView);
        authBox.appendChild(form);
    }

    function toggleView() {
        isLoginView = !isLoginView;
        renderView();
    }

    renderView();
    wrapper.appendChild(authBox);
    contentContainer.appendChild(wrapper);
}

/* =========================
   FORM CREATION HELPERS
========================= */
function createLoginForm(onToggleView) {
    const section = createElement("section", { class: "auth-section" }, []);
    const title = createElement("h2", { class: "auth-title" }, ["Log In"]);

    const usernameInput = inputField("text", "Username", "login-username", "username");
    const passwordInput = inputField("password", "Password", "login-password", "current-password");
    const submitBtn = createElement("button", { type: "submit", class: "btn-primary" }, ["Login"]);

    const toggleText = createElement("p", { class: "auth-toggle" }, [
        "Don't have an account? ",
        createElement(
            "a",
            {
                href: "#",
                events: {
                    click: (e) => {
                        e.preventDefault();
                        onToggleView();
                    }
                }
            },
            ["Sign Up"]
        )
    ]);

    const form = createElement("form", { class: "auth-form" }, [
        usernameInput,
        passwordInput,
        submitBtn,
        toggleText
    ]);

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
            username: usernameInput.value.trim(),
            password: passwordInput.value
        };

        await login(payload);
    });

    section.append(title, form);
    return section;
}

function createSignupForm(onToggleView) {
    const section = createElement("section", { class: "auth-section" }, []);
    const title = createElement("h2", { class: "auth-title" }, ["Sign Up"]);

    const usernameInput = inputField("text", "Username", "signup-username", "username");
    const emailInput = inputField("email", "Email", "signup-email", "email");
    const passwordInput = inputField("password", "Password", "signup-password", "new-password");

    const checkbox = createElement("input", { type: "checkbox", id: "signup-terms", required: true }, []);
    const termsLabel = createElement("label", { class: "auth-terms", htmlFor: "signup-terms" }, [
        checkbox,
        " I agree to the Terms & Conditions"
    ]);

    const submitBtn = createElement("button", { type: "submit", class: "btn-primary" }, ["Sign Up"]);

    const toggleText = createElement("p", { class: "auth-toggle" }, [
        "Already have an account? ",
        createElement(
            "a",
            {
                href: "#",
                events: {
                    click: (e) => {
                        e.preventDefault();
                        onToggleView();
                    }
                }
            },
            ["Log In"]
        )
    ]);

    const form = createElement("form", { class: "auth-form" }, [
        usernameInput,
        emailInput,
        passwordInput,
        termsLabel,
        submitBtn,
        toggleText
    ]);

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!checkbox.checked) {
            Notify("You must agree to the Terms & Conditions.", { type: "warning", duration: 3000 });
            return;
        }

        const payload = {
            username: usernameInput.value.trim(),
            email: emailInput.value.trim(),
            password: passwordInput.value
        };

        const success = await signup(payload);
        if (success) {
            onToggleView(); // Switches view to Login upon successful registration
        }
    });

    section.append(title, form);
    return section;
}

function inputField(type, placeholder, id, autocomplete = "") {
    const attrs = { type, id, placeholder, required: true };
    if (autocomplete) {
        attrs.autocomplete = autocomplete;
    }
    return createElement("input", attrs, []);
}