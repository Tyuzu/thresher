import { chatFetch } from "../../api/api.js";
import { getState } from "../../state/state.js";
import { navigate } from "../../routes/index.js";
import { displayNewChat } from "./displayNewchat.js";
import { renderSharedChatList } from "../chat/sharedChatList.js";

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
      getState("user");

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