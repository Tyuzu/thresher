import { chatFetch } from "../../api/api.ts";
import { getState } from "../../state/state.ts";
import { navigate } from "../../routes/navigate.ts";
import { displayNewChat } from "./displayNewchat.ts";
import { renderSharedChatList } from "../chat/sharedChatList.ts";

export async function displayChats(
  contentContainer,
  isLoggedIn
) {
  await renderSharedChatList({
    container: contentContainer,
    isLoggedIn,
    loginText: "Please log in to view chats.",
    emptyText: "No chats found.",
    fetchChats: async () => chatFetch("/api/v1/newchats/all"),
    renderChat: (chatView, chat, { currentUser, isLoggedIn }) => {
      displayNewChat(chatView, chat?.chatid, isLoggedIn, currentUser);
    },
    getChatId: chat => chat?.chatid,
    getOtherUser: (chat, currentUser) =>
      chat?.users?.find(user => user !== currentUser) ?? "Unknown",
    getLastMessage: chat => chat?.lastMessage?.text?.trim() || "No messages yet",
    getTimestamp: chat => chat?.lastMessage?.timestamp
  });
}

export async function userNewChatInit(
  targetUserId
) {
  try {
    const currentUserId =
      getState("user").userid;

    if (
      !currentUserId ||
      !targetUserId
    ) {
      throw new Error(
        "Missing user IDs"
      );
    }

    const payload = {
      userA: currentUserId,
      userB: targetUserId
    };

    const data = await chatFetch(
      "/api/v1/newchats/init",
      "POST",
      payload
    );

    if (!data?.chatid) {
      throw new Error(
        "Chat ID missing in response"
      );
    }

    navigate(
      `/newchat/${data.chatid}`
    );
  } catch (err) {
    console.error(
      "Chat init error:",
      err
    );

    alert(
      "Unable to start or find chat."
    );
  }
}