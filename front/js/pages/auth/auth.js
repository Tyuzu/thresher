import "../../../css/inistyles/authpage.css";
// pages/auth.js
import { login, signup } from "../../services/auth/authService.js";
import { getState, subscribeDeep } from "../../state/state.js";
import { createElement } from "../../components/createElement.js";
import { navigate } from "../../routes/index.js";

let unsubscribeToken = null;

// --- Main entry
export function Auth(isL, contentContainer) {
  if (typeof unsubscribeToken === "function") {
    unsubscribeToken();
    unsubscribeToken = null;
  }

  if (getState("token")) {
    navigate("/home");
    return;
  }

  clearContainer(contentContainer);
  renderAuthSection(isL, contentContainer);

  unsubscribeToken = subscribeDeep("token", (token) => {
    if (token) {
      if (typeof unsubscribeToken === "function") {
        unsubscribeToken();
        unsubscribeToken = null;
      }
      navigate("/home");
    }
  });
}

function clearContainer(el) {
  if (!el) return;
  while (el.firstChild) {
    el.firstChild.remove();
  }
}

function renderAuthSection(isL, contentContainer) {
  clearContainer(contentContainer);

  if (getState("token")) {
    navigate("/home");
    return;
  }

  const wrapper = createElement("div", { class: "auth-wrapper" }, []);
  const authBox = createElement("div", { class: "auth-box" }, []);

  const loginForm = createLoginForm();
  const divider = createElement("div", { class: "auth-divider" }, ["or"]);
  const signupForm = createSignupForm();

  authBox.append(loginForm, divider, signupForm);
  wrapper.append(authBox);
  contentContainer.append(wrapper);
}

function createLoginForm() {
  const section = createElement("section", { class: "auth-section" }, []);
  const title = createElement("h2", { class: "auth-title" }, ["Log In"]);

  const usernameInput = inputField("text", "Username", "login-username", "username");
  const passwordInput = inputField("password", "Password", "login-password", "current-password");
  const submitBtn = submitButton("Login");

  const form = createElement("form", { class: "auth-form" }, []);
  form.append(usernameInput, passwordInput, submitBtn);
  form.addEventListener("submit", login);

  section.append(title, form);
  return section;
}

function createSignupForm() {
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

  const submitBtn = submitButton("Signup");
  const form = createElement("form", { class: "auth-form" }, []);
  form.append(usernameInput, emailInput, passwordInput, termsLabel, submitBtn);

  form.addEventListener("submit", (e) => {
    // Scoped query selector prevents targeting stale DOM elements
    const termsCheck = e.currentTarget.querySelector("#signup-terms");
    if (!termsCheck?.checked) {
      e.preventDefault();
      import("../../components/ui/Notify.mjs").then(({ default: Notify }) => {
        Notify("You must agree to the Terms & Conditions.", { type: "warning", duration: 3000 });
      });
      return;
    }
    signup(e);
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

function submitButton(label) {
  return createElement("button", { type: "submit" }, [label]);
}