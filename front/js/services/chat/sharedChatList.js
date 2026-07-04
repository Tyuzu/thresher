import { createElement } from "../../components/createElement.js";
import { getState } from "../../state/state.js";

export async function renderSharedChatList({
  container,
  isLoggedIn,
  loginText = "Please log in to view chats.",
  emptyText = "No chats found.",
  fetchChats,
  renderChat,
  getChatId = chat => chat?.chatid,
  getOtherUser = (chat, currentUser) => {
    const participants = Array.isArray(chat?.participants)
      ? chat.participants
      : [];

    return participants.filter(user => user !== currentUser).join(", ") || "Unknown";
  },
  getLastMessage = chat => chat?.lastMessage?.text?.trim() || "No messages yet",
  getTimestamp = chat => chat?.lastMessage?.timestamp
}) {
  container.replaceChildren();

  if (!isLoggedIn) {
    container.appendChild(
      createElement("p", { "aria-live": "polite" }, [loginText])
    );
    return;
  }

  const wrapper = createElement("div", { class: "chat-wrapper" });
  const sidebar = createElement("div", { class: "chat-topbar" });
  const list = createElement("ul", { class: "chat-list" });
  const chatView = createElement("div", { class: "chat-view" });

  sidebar.appendChild(list);
  wrapper.append(sidebar, chatView);
  container.appendChild(wrapper);

  try {
    const chats = (await fetchChats()) || [];
    const currentUser = getState("user") || "";

    if (!Array.isArray(chats) || chats.length === 0) {
      list.appendChild(
        createElement("li", { class: "no-chats" }, [emptyText])
      );
      return;
    }

    let activeChatItem = null;

    chats.forEach(chat => {
      const chatId = getChatId(chat);
      const chatItem = createChatListItem(
        chat,
        currentUser,
        () => {
          if (activeChatItem) {
            activeChatItem.classList.remove("chat-item-active");
          }

          chatItem.classList.add("chat-item-active");
          activeChatItem = chatItem;

          renderChat(chatView, chat, { currentUser, isLoggedIn });
        },
        {
          getOtherUser,
          getLastMessage,
          getTimestamp
        }
      );

      if (chatId) {
        chatItem.dataset.id = String(chatId);
      }

      list.appendChild(chatItem);
    });

    const firstChat = chats[0];

    if (firstChat) {
      const firstItem = list.querySelector(".chat-item");
      if (firstItem) {
        firstItem.classList.add("chat-item-active");
        activeChatItem = firstItem;
      }

      renderChat(chatView, firstChat, { currentUser, isLoggedIn });
    }
  } catch (err) {
    console.error("Error loading chats:", err);
    list.appendChild(
      createElement("li", { class: "chat-error" }, ["Failed to load chats."])
    );
  }
}

function createChatListItem(
  chat,
  currentUser,
  onClick,
  { getOtherUser, getLastMessage, getTimestamp }
) {
  const otherUser = getOtherUser(chat, currentUser);
  const lastMessage = getLastMessage(chat);
  const timestamp = formatTimestamp(getTimestamp(chat));

  const li = createElement("li", {
    class: "chat-item",
    events: {
      click: onClick
    }
  });

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

function formatTimestamp(timestamp) {
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
