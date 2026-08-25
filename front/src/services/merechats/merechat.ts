import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import { closeExistingSocket } from "./chatSocket.js";
import { t } from "./i18n.js";
import { safemereFetch, displayOneChat } from "./onechat.js";
import { renderSharedChatList } from "../chat/sharedChatList.js";

/* ───────────────────────────────────────── */
/* Types & Interfaces                       */
/* ───────────────────────────────────────── */

export interface ChatMessageSummary {
  text?: string;
  timestamp?: string | number;
  [key: string]: unknown;
}

export interface ChatItem {
  chatid: string | number;
  participants?: (string | number)[];
  lastMessage?: ChatMessageSummary;
  [key: string]: unknown;
}

/* ───────────────────────────────────────── */
/* Main View Renderer                        */
/* ───────────────────────────────────────── */

export async function displayChats(
  contentContainer: HTMLElement,
  isLoggedIn: boolean
): Promise<void> {
  // Add a base class to container for layout styling
  contentContainer.classList.add("chats-view-wrapper");

  await renderSharedChatList({
    container: contentContainer,
    isLoggedIn,
    loginText: t("chat.login_prompt"),
    emptyText: t("chat.no_chats"),
    fetchChats: async (): Promise<ChatItem[]> => {
      const chats = (await safemereFetch<ChatItem[]>("/merechats/all?skip=0&limit=20")) || [];
      return chats;
    },
    renderChat: async (chatView: HTMLElement, chat: ChatItem): Promise<void> => {
      const chatId = chat?.chatid;

      // Close active socket from previous chat session
      closeExistingSocket("switch");

      const chatBody = createElement("div", { class: "chat-body" }) as HTMLElement;

      const handleBack = (): void => {
        closeExistingSocket("back");
        chatView.replaceChildren();
        // Remove active state on mobile to reveal the list again
        contentContainer.classList.remove("has-open-chat");
      };

      // Mobile back button using updated Button component
      const backBtn = Button({
        title: t("chat.back"),
        classes: "chat-back-button",
        type: "button",
        "aria-label": t("chat.back"),
        events: {
          click: handleBack
        }
      });

      // Assemble chat viewport
      chatView.replaceChildren(backBtn, chatBody);

      // Mark wrapper as active to trigger mobile sliding/full-screen view
      contentContainer.classList.add("has-open-chat");

      // Initialize chat connection and render messages
      await displayOneChat(chatBody, chatId);
    },
    getChatId: (chat: ChatItem): string | number => chat?.chatid,
    getOtherUser: (chat: ChatItem, currentUser: string | number): string => {
      const participants = Array.isArray(chat?.participants)
        ? chat.participants
        : [];

      return participants.filter(p => p !== currentUser).join(", ") || t("chat.unknown");
    },
    getLastMessage: (chat: ChatItem): string =>
      chat?.lastMessage?.text?.trim() || t("chat.no_messages"),
    getTimestamp: (chat: ChatItem): string | number | undefined =>
      chat?.lastMessage?.timestamp
  });
}