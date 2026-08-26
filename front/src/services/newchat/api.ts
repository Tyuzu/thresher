import { chatFetch } from "../../api/api.js";

export interface NewChatInitResponse {
  chatid?: string | number;
  [key: string]: unknown;
}

export async function fetchNewChats(): Promise<any> {
  return await chatFetch("/api/v1/newchats/all", "GET");
}

export async function initNewChat(payload: Record<string, unknown>): Promise<NewChatInitResponse> {
  return await chatFetch<NewChatInitResponse>("/api/v1/newchats/init", "POST", payload);
}

export async function uploadNewChatFiles(payload: Record<string, unknown>): Promise<any> {
  return await chatFetch("/newchat/upload", "POST", payload);
}
