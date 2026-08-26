import { mereFetch } from "../../api/api.js";

export interface ChatResponse {
  chatid: string | number;
  [key: string]: unknown;
}

export async function startMeChat(
  participants: Array<string | number>,
  entityType: string,
  entityId: string | number
): Promise<ChatResponse> {
  return await mereFetch<ChatResponse>("/merechats/start", "POST", {
    participants,
    entityType,
    entityId
  });
}
