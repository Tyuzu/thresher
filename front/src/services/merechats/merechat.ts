import { createElement } from "../../components/createElement.js";
import { closeExistingSocket } from "./chatSocket.js";
import { t } from "./i18n.js";
import { safemereFetch, displayOneChat } from "./onechat.js";
import { renderSharedChatList } from "../chat/sharedChatList.js";

export async function displayChats(contentContainer, isLoggedIn) {
  // Add a base class to container for layout styling
  contentContainer.classList.add("chats-view-wrapper");

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

      // Close active socket from previous chat session
      closeExistingSocket("switch");

      const chatBody = createElement("div", { class: "chat-body" });

      // Mobile back button with proper touch-target aria labels
      const backBtn = createElement(
        "button",
        {
          class: "chat-back-button",
          type: "button",
          "aria-label": t("chat.back")
        },
        [
          createElement("span", { class: "back-icon", "aria-hidden": "true" }, ["←"]),
          createElement("span", { class: "back-text" }, [t("chat.back")])
        ]
      );

      const handleBack = () => {
        closeExistingSocket("back");
        chatView.replaceChildren();
        // Remove active state on mobile to reveal the list again
        contentContainer.classList.remove("has-open-chat");
      };

      backBtn.addEventListener("click", handleBack);

      // Assemble chat viewport
      chatView.replaceChildren(backBtn, chatBody);
      
      // Mark wrapper as active to trigger mobile sliding/full-screen view
      contentContainer.classList.add("has-open-chat");

      // Initialize chat connection and render messages
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