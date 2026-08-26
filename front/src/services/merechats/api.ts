import { mereFetch } from "../../api/api.js";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export async function merechatFetch<T = unknown>(
  url: string,
  method: HttpMethod = "GET",
  body: string | FormData | null = null,
  options: Record<string, unknown> = {}
): Promise<T> {
  return await mereFetch<T>(url, method, body, options as any);
}

export async function safemereFetch<T = unknown>(
  url: string,
  method: HttpMethod = "GET",
  body: string | FormData | null = null,
  options: Record<string, unknown> = {}
): Promise<T | null> {
  try {
    return await merechatFetch<T>(url, method, body, options);
  } catch {
    return null;
  }
}

export async function fetchChats(limit = 20, skip = 0): Promise<any> {
  return await merechatFetch(`/merechats/all?skip=${skip}&limit=${limit}`);
}

export async function fetchChatMessages(chatId: string | number): Promise<any> {
  return await merechatFetch(`/merechats/chat/${encodeURIComponent(String(chatId))}/messages`);
}

export async function sendChatMessage(chatId: string | number, content: string, clientId?: string): Promise<any> {
  return await merechatFetch(`/merechats/chat/${encodeURIComponent(String(chatId))}/message`, "POST", JSON.stringify({ content, clientId }));
}

export async function updateMessage(messageId: string | number, content: string): Promise<any> {
  return await merechatFetch(`/merechats/messages/${encodeURIComponent(String(messageId))}`, "PUT", JSON.stringify({ content }));
}

export async function deleteMessage(messageId: string | number): Promise<any> {
  return await merechatFetch(`/merechats/messages/${encodeURIComponent(String(messageId))}`, "DELETE");
}
