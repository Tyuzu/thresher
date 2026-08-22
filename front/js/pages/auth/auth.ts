import "../../../css/inistyles/authpage.css";
import {
  login,
  signup
} from "../../services/auth/authService.js";
import {
  createElement
} from "../../components/createElement.js";
import {
  getState
} from "../../state/state.js";
import Notify from "../../components/ui/Notify.js";


export function Auth(isLoggedIn, contentContainer) {
  if (!contentContainer) {
    return;
  }
  const stateToken = getState("token");
  const isAuthenticated = Boolean(isLoggedIn || stateToken || localStorage.getItem("token") || sessionStorage.getItem("token"));
  /*
   * Authentication redirect is handled by
   * the route middleware. Do not perform
   * navigation during rendering.
   *
   * In normal operation /login won't reach
   * this renderer when already authenticated.
   */
  if (isAuthenticated) {
    contentContainer.replaceChildren();
    return;
  }
  contentContainer.replaceChildren();
  let isLoginView = true;
  const wrapper = createElement("div", {
    class: "auth-wrapper"
  },
    []);
  const authBox = createElement("div", {
    class: "auth-box"
  },
    []);
  let submitting = false;

  function renderView() {
    authBox.replaceChildren();
    const form = isLoginView ? createLoginForm(toggleView,
      () => submitting,
      (value) => {
        submitting = value;
      }) : createSignupForm(toggleView,
        () => submitting,
        (value) => {
          submitting = value;
        });
    authBox.appendChild(form);
  }

  function toggleView() {
    if (submitting) {
      return;
    }
    isLoginView = !isLoginView;
    renderView();
  }
  wrapper.appendChild(authBox);
  contentContainer.appendChild(wrapper);
  renderView();
}

/* =========================================================
   LOGIN FORM
========================================================= */
function createLoginForm(onToggleView, getSubmitting, setSubmitting) {
  const section = createElement("section", {
    class: "auth-section"
  },
    []);
  const title = createElement("h2", {
    class: "auth-title"
  },
    ["Log In"]);
  const usernameInput = inputField("text", "Username", "login-username", "username");
  const passwordInput = inputField("password", "Password", "login-password", "current-password");
  const submitBtn = createElement("button", {
    type: "submit",
    class: "btn-primary"
  },
    ["Login"]);
  const toggleText = createElement("p", {
    class: "auth-toggle"
  },
    ["Don't have an account? ",
      createElement("a", {
        href: "#",
        events: {
          click: (event) => {
            event.preventDefault();
            if (!getSubmitting()) {
              onToggleView();
            }
          }
        }
      },
        ["Sign Up"])
    ]);
  const form = createElement("form", {
    class: "auth-form"
  },
    [
      usernameInput,
      passwordInput,
      submitBtn,
      toggleText
    ]);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (getSubmitting()) {
      return;
    }
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    if (!username || !password) {
      Notify("Username and password are required.", {
        type: "error",
        duration: 3000
      });
      return;
    }
    setSubmitting(true);
    submitBtn.disabled = true;
    try {
      const success = await login({
        username,
        password
      });
      if (!success) {
        submitBtn.disabled = false;
      }
    } catch (error) {
      console.error("Login failed:", error);
      submitBtn.disabled = false;
    } finally {
      setSubmitting(false);
    }
  });
  section.append(title, form);
  return section;
}

/* =========================================================
   SIGNUP FORM
========================================================= */
function createSignupForm(onToggleView, getSubmitting, setSubmitting) {
  const section = createElement("section", {
    class: "auth-section"
  },
    []);
  const title = createElement("h2", {
    class: "auth-title"
  },
    ["Sign Up"]);
  const usernameInput = inputField("text", "Username", "signup-username", "username");
  const emailInput = inputField("email", "Email", "signup-email", "email");
  const passwordInput = inputField("password", "Password", "signup-password", "new-password");
  const checkbox = createElement("input", {
    type: "checkbox",
    id: "signup-terms",
    required: true
  },
    []);
  const termsLabel = createElement("label", {
    class: "auth-terms",
    htmlFor: "signup-terms"
  },
    [
      checkbox, " I agree to the Terms & Conditions"
    ]);
  const submitBtn = createElement("button", {
    type: "submit",
    class: "btn-primary"
  },
    ["Sign Up"]);
  const toggleText = createElement("p", {
    class: "auth-toggle"
  },
    ["Already have an account? ",
      createElement("a", {
        href: "#",
        events: {
          click: (event) => {
            event.preventDefault();
            if (!getSubmitting()) {
              onToggleView();
            }
          }
        }
      },
        ["Log In"])
    ]);
  const form = createElement("form", {
    class: "auth-form"
  },
    [
      usernameInput,
      emailInput,
      passwordInput,
      termsLabel,
      submitBtn,
      toggleText
    ]);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (getSubmitting()) {
      return;
    }
    if (!checkbox.checked) {
      Notify("You must agree to the Terms & Conditions.", {
        type: "warning",
        duration: 3000
      });
      return;
    }
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    setSubmitting(true);
    submitBtn.disabled = true;
    try {
      const success = await signup({
        username,
        email,
        password
      });
      if (success) {
        onToggleView();
      } else {
        submitBtn.disabled = false;
      }
    } catch (error) {
      console.error("Signup failed:", error);
      submitBtn.disabled = false;
    } finally {
      setSubmitting(false);
    }
  });
  section.append(title, form);
  return section;
}
/* =========================================================
   INPUT
========================================================= */
function inputField(type, placeholder, id, autocomplete = "") {
  const attrs = {
    type,
    id,
    placeholder,
    required: true
  };
  if (autocomplete) {
    attrs.autocomplete = autocomplete;
  }
  return createElement("input", attrs,
    []);
}