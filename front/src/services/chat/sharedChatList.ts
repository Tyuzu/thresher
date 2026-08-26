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
  participants?: (string | number)[];
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

export interface RenderChatContext<UserType = string | number> {
  currentUser: UserType;
  isLoggedIn: boolean;
}

export interface SharedChatListExtractors<T = GenericChat, UserType = string | number> {
  getOtherUser: (chat: T, currentUser: UserType) => string;
  getLastMessage: (chat: T) => string;
  getTimestamp: (chat: T) => string | number | Date | undefined;
}

export interface RenderSharedChatListOptions<T = GenericChat, UserType = string | number> {
  container: HTMLElement | null;
  isLoggedIn: boolean;
  loginText?: string;
  emptyText?: string;
  fetchChats: () => Promise<T[] | null | undefined>;
  renderChat: (
    targetView: HTMLElement,
    chat: T,
    context: RenderChatContext<UserType>
  ) => void;
  getChatId?: (chat: T) => string | number | undefined;
  getOtherUser?: (chat: T, currentUser: UserType) => string;
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

function extractCurrentUserId(): string | number {
  const userState = getState("user") as UserStateObject | string | number | null;

  if (userState && typeof userState === "object") {
    const rawUser = userState.userid ?? userState.id;
    if (typeof rawUser === "object" && rawUser !== null) {
      return (
        (rawUser as UserStateObject).id ??
        (rawUser as UserStateObject).userid ??
        (rawUser as UserStateObject).username ??
        (rawUser as UserStateObject).email ??
        ""
      );
    }
    return rawUser ?? "";
  }

  return (typeof userState === "string" || typeof userState === "number") ? userState : "";
}

function createChatListItem<T = GenericChat, UserType = string | number>(
  chat: T,
  currentUser: UserType,
  onClick: (event: Event) => void,
  { getOtherUser, getLastMessage, getTimestamp }: SharedChatListExtractors<T, UserType>
): HTMLLIElement {
  const otherUser = getOtherUser(chat, currentUser);
  const lastMessage = getLastMessage(chat);
  const timestamp = formatTimestamp(getTimestamp(chat));

  const li = createElement("li", {
    class: "chat-item",
    role: "option",
    tabindex: "0",
    "aria-selected": "false",
    events: {
      click: onClick as EventListener,
      keydown: ((e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(e);
        }
      }) as EventListener
    }
  }) as HTMLLIElement;

  const avatar = createElement("div", { class: "chat-avatar" }, [
    String(otherUser).charAt(0).toUpperCase() || "?"
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

export async function renderSharedChatList<T = GenericChat, UserType = string | number>({
  container,
  isLoggedIn,
  loginText = "Please log in to view chats.",
  emptyText = "No chats found.",
  fetchChats,
  renderChat,
  getChatId = (chat) => (chat as GenericChat)?.chatid ?? (chat as GenericChat)?.id,
  getOtherUser = (chat, currentUser) => {
    const participants = Array.isArray((chat as GenericChat)?.participants)
      ? ((chat as GenericChat).participants as (string | number)[])
      : [];

    const otherParticipants = participants.filter(
      (user) => String(user) !== String(currentUser)
    );

    return otherParticipants.join(", ") || "Unknown";
  },
  getLastMessage = (chat) =>
    (chat as GenericChat)?.lastMessage?.text?.trim() || "No messages yet",
  getTimestamp = (chat) => (chat as GenericChat)?.lastMessage?.timestamp
}: RenderSharedChatListOptions<T, UserType>): Promise<void> {
  if (!container) return;
  container.replaceChildren();

  if (!isLoggedIn) {
    container.appendChild(
      createElement("p", { "aria-live": "polite", class: "chat-login-prompt" }, [loginText])
    );
    return;
  }

  const wrapper = createElement("div", { class: "chat-wrapper" });
  const sidebar = createElement("div", { class: "chat-sidebar" });
  const list = createElement("ul", {
    class: "chat-list",
    role: "listbox",
    "aria-label": "Chat list"
  });
  const chatView = createElement("div", { class: "chat-view" }) as HTMLElement;

  sidebar.appendChild(list);
  wrapper.append(sidebar, chatView);
  container.appendChild(wrapper);

  try {
    const chats = (await fetchChats()) || [];
    const currentUser = extractCurrentUserId() as UserType;

    if (!Array.isArray(chats) || chats.length === 0) {
      list.appendChild(
        createElement("li", { class: "no-chats", role: "option" }, [emptyText])
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
          activeChatItem.setAttribute("aria-selected", "false");
        }
        itemElement.classList.add("chat-item-active");
        itemElement.setAttribute("aria-selected", "true");
        activeChatItem = itemElement;

        renderChat(chatView, chat, { currentUser, isLoggedIn });
      };

      const chatItem = createChatListItem<T, UserType>(
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
      createElement("li", { class: "chat-error", role: "option" }, ["Failed to load chats."])
    );
  }
}