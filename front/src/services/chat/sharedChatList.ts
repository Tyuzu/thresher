import { createElement } from "../../components/createElement.js";
import { getState } from "../../state/state.js";

/* =========================================================
   TYPES & INTERFACES
========================================================= */

export interface ChatMessage {
  text?: string;
  timestamp?: string | number | Date;
  [key: string]: unknown;
}

export interface GenericChat {
  chatid?: string | number;
  id?: string | number;
  participants?: string[];
  lastMessage?: ChatMessage;
  [key: string]: unknown;
}

export interface UserStateObject {
  id?: string | number;
  userid?: string | number;
  username?: string;
  email?: string;
  [key: string]: unknown;
}

export interface RenderChatContext {
  currentUser: string;
  isLoggedIn: boolean;
}

export interface SharedChatListExtractors<T = GenericChat> {
  getOtherUser: (chat: T, currentUser: string) => string;
  getLastMessage: (chat: T) => string;
  getTimestamp: (chat: T) => string | number | Date | undefined;
}

export interface RenderSharedChatListOptions<T = GenericChat> {
  container: HTMLElement | null;
  isLoggedIn: boolean;
  loginText?: string;
  emptyText?: string;
  fetchChats: () => Promise<T[] | null | undefined>;
  renderChat: (
    targetView: HTMLElement,
    chat: T,
    context: RenderChatContext
  ) => void;
  getChatId?: (chat: T) => string | number | undefined;
  getOtherUser?: (chat: T, currentUser: string) => string;
  getLastMessage?: (chat: T) => string;
  getTimestamp?: (chat: T) => string | number | Date | undefined;
}

interface ItemClickHandler {
  element: HTMLLIElement;
  trigger: () => void;
}

/* =========================================================
   UTILITY HELPERS
========================================================= */

function formatTimestamp(
  timestamp: string | number | Date | undefined
): string {
  if (!timestamp || timestamp === "0001-01-01T00:00:00Z") {
    return "";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function createChatListItem<T = GenericChat>(
  chat: T,
  currentUser: string,
  onClick: (event: Event) => void,
  { getOtherUser, getLastMessage, getTimestamp }: SharedChatListExtractors<T>
): HTMLLIElement {
  const otherUser = getOtherUser(chat, currentUser);
  const lastMessage = getLastMessage(chat);
  const timestamp = formatTimestamp(getTimestamp(chat));

  const li = createElement("li", {
    class: "chat-item",
    events: {
      click: onClick
    }
  }) as HTMLLIElement;

  const avatar = createElement("div", { class: "chat-avatar" }, [
    String(otherUser).charAt(0).toUpperCase()
  ]);

  const info = createElement("div", { class: "chat-info" });
  const name = createElement("strong", { class: "chat-name" }, [otherUser]);
  const preview = createElement("div", { class: "chat-preview" }, [lastMessage]);
  const time = createElement("div", { class: "chat-time" }, [timestamp]);

  info.append(name, preview);
  li.append(avatar, info, time);
  return li;
}

/* =========================================================
   MAIN ENTRY
========================================================= */

export async function renderSharedChatList<T = GenericChat>({
  container,
  isLoggedIn,
  loginText = "Please log in to view chats.",
  emptyText = "No chats found.",
  fetchChats,
  renderChat,
  getChatId = (chat) => (chat as GenericChat)?.chatid,
  getOtherUser = (chat, currentUser) => {
    const participants = Array.isArray((chat as GenericChat)?.participants)
      ? ((chat as GenericChat).participants as string[])
      : [];

    return (
      participants.filter((user) => user !== currentUser).join(", ") || "Unknown"
    );
  },
  getLastMessage = (chat) =>
    (chat as GenericChat)?.lastMessage?.text?.trim() || "No messages yet",
  getTimestamp = (chat) => (chat as GenericChat)?.lastMessage?.timestamp
}: RenderSharedChatListOptions<T>): Promise<void> {
  if (!container) return;
  container.replaceChildren();

  if (!isLoggedIn) {
    container.appendChild(
      createElement("p", { "aria-live": "polite" }, [loginText])
    );
    return;
  }

  const wrapper = createElement("div", { class: "chat-wrapper" });
  const sidebar = createElement("div", { class: "chat-sidebar" });
  const list = createElement("ul", { class: "chat-list" });
  const chatView = createElement("div", { class: "chat-view" }) as HTMLElement;

  sidebar.appendChild(list);
  wrapper.append(sidebar, chatView);
  container.appendChild(wrapper);

  try {
    const chats = (await fetchChats()) || [];

    // Safely extract active user identifier without risk of NPEs
    const userState = getState("user") as UserStateObject | string | null;
    let currentUser = "";

    if (userState && typeof userState === "object") {
      const rawUser = userState.userid ?? userState.id;
      if (typeof rawUser === "object" && rawUser !== null) {
        currentUser = String(
          (rawUser as UserStateObject).id ??
            (rawUser as UserStateObject).username ??
            (rawUser as UserStateObject).email ??
            ""
        );
      } else {
        currentUser = String(rawUser ?? "");
      }
    } else {
      currentUser = String(userState ?? "");
    }

    if (!Array.isArray(chats) || chats.length === 0) {
      list.appendChild(
        createElement("li", { class: "no-chats" }, [emptyText])
      );
      return;
    }

    let activeChatItem: HTMLLIElement | null = null;
    const itemClickHandlers: ItemClickHandler[] = [];

    chats.forEach((chat) => {
      const chatId = getChatId(chat);

      const selectThisItem = (itemElement: HTMLLIElement): void => {
        if (activeChatItem) {
          activeChatItem.classList.remove("chat-item-active");
        }
        itemElement.classList.add("chat-item-active");
        activeChatItem = itemElement;

        renderChat(chatView, chat, { currentUser, isLoggedIn });
      };

      const chatItem = createChatListItem(
        chat,
        currentUser,
        () => selectThisItem(chatItem),
        { getOtherUser, getLastMessage, getTimestamp }
      );

      if (chatId !== undefined && chatId !== null) {
        chatItem.dataset.id = String(chatId);
      }

      list.appendChild(chatItem);

      itemClickHandlers.push({
        element: chatItem,
        trigger: () => selectThisItem(chatItem)
      });
    });

    if (itemClickHandlers.length > 0) {
      itemClickHandlers[0].trigger();
    }
  } catch (err) {
    console.error("Error loading chats:", err);
    list.appendChild(
      createElement("li", { class: "chat-error" }, ["Failed to load chats."])
    );
  }
}