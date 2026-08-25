import { chatFetch } from "../../api/api.js";
import { getState } from "../../state/state.js";
import { navigate } from "../../routes/navigate.js";
import { displayNewChat } from "./displayNewchat.js";
import { renderSharedChatList } from "../chat/sharedChatList.js";

export interface ChatMessage {
  text?: string;
  timestamp?: string | number;
}

export interface ChatItem {
  chatid: string | number;
  users?: (string | number)[];
  lastMessage?: ChatMessage;
}

export async function displayChats(
  contentContainer: HTMLElement,
  isLoggedIn: boolean
): Promise<void> {
  await renderSharedChatList<ChatItem, string | number>({
    container: contentContainer,
    isLoggedIn,
    loginText: "Please log in to view chats.",
    emptyText: "No chats found.",
    fetchChats: async () => chatFetch("/api/v1/newchats/all", "GET"),
    renderChat: (
      chatView: HTMLElement,
      chat: ChatItem,
      { currentUser, isLoggedIn }: { currentUser: string | number; isLoggedIn: boolean }
    ) => {
      displayNewChat(chatView, chat?.chatid, isLoggedIn, currentUser);
    },
    getChatId: (chat: ChatItem) => chat?.chatid,
    getOtherUser: (chat: ChatItem, currentUser: string | number) => {
      const otherUser = chat?.users?.find(
        (user) => String(user) !== String(currentUser)
      );
      return otherUser !== undefined ? String(otherUser) : "Unknown";
    },
    getLastMessage: (chat: ChatItem) =>
      chat?.lastMessage?.text?.trim() || "No messages yet",
    getTimestamp: (chat: ChatItem) => chat?.lastMessage?.timestamp
  });
}

export async function userNewChatInit(
  targetUserId: string | number
): Promise<void> {
  try {
    const currentUserId = getState("user")?.userid;

    if (!currentUserId || !targetUserId) {
      throw new Error("Missing user IDs");
    }

    const payload = {
      userA: currentUserId,
      userB: targetUserId
    };

    const data: { chatid?: string | number } = await chatFetch(
      "/api/v1/newchats/init",
      "POST",
      payload
    );

    if (!data?.chatid) {
      throw new Error("Chat ID missing in response");
    }

    navigate(`/newchat/${data.chatid}`);
  } catch (err) {
    console.error("Chat init error:", err);
    alert("Unable to start or find chat.");
  }
}