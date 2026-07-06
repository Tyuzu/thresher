import { createElement } from "../../components/createElement.js";
import { closeExistingSocket } from "./chatSocket.js";
import { t } from "./i18n.js";
import { safemereFetch, displayOneChat } from "./onechat.js";
import { renderSharedChatList } from "../chat/sharedChatList.js";

const chatBodies = new Map();

export async function displayChats(contentContainer, isLoggedIn) {
  await renderSharedChatList({
    container: contentContainer,
    isLoggedIn,
    loginText: t("chat.login_prompt"),
    emptyText: t("chat.no_chats"),
    fetchChats: async () => {
      const chats = (await safemereFetch("/merechats/all?skip=0&limit=20")) || [];
      return chats;
    },
    renderChat: async (chatView, chat) => {
      const chatId = chat?.chatid;
      let chatBody = chatBodies.get(chatId);

      if (!chatBody) {
        chatBody = createElement("div", { class: "chat-body" });
        chatBodies.set(chatId, chatBody);
      }

      const backBtn = createElement(
        "button",
        {
          class: "chat-back-button",
          "aria-label": t("chat.back")
        },
        ["← ", t("chat.back")]
      );

      backBtn.addEventListener("click", () => {
        closeExistingSocket("back");
        chatView.replaceChildren();
      });

      chatView.replaceChildren(backBtn, chatBody);
      await displayOneChat(chatBody, chatId);
    },
    getChatId: chat => chat?.chatid,
    getOtherUser: (chat, currentUser) => {
      const participants = Array.isArray(chat?.participants)
        ? chat.participants
        : [];

      return participants.filter(p => p !== currentUser).join(", ") || t("chat.unknown");
    },
    getLastMessage: chat => chat?.lastMessage?.text?.trim() || t("chat.no_messages"),
    getTimestamp: chat => chat?.lastMessage?.timestamp
  });
}