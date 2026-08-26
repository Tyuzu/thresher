import { apiFetch } from "../../api/api.js";

export async function registerUser(username: string, email: string, password: string) {
  return await apiFetch("/auth/register", "POST", { username, email, password }, { credentials: "include", auth: false });
}

export async function loginUser(username: string, password: string) {
  return await apiFetch("/auth/login", "POST", { username, password }, { credentials: "include", auth: false });
}

export async function logoutUser() {
  return await apiFetch("/auth/logout", "POST", null, { credentials: "include", headers: { "X-Refresh-Intent": "1" } });
}

export default { registerUser, loginUser, logoutUser };
