import { chatFetch } from "../../api/api.js";
import { getState } from "../../state/state.js";
import { navigate } from "../../routes/index.js";
import { displayNewChat } from "./displayNewchat.js";
import { createElement } from "../../components/createElement.js";
import { makeDraggableScroll } from "../../components/dragnav.js";

export async function displayChats(
  contentContainer,
  isLoggedIn
) {
  clearContainer(contentContainer);

  const wrapper = createElement("div", {
    class: "chat-wrapper"
  });

  const sidebar = createElement("div", {
    class: "chat-topbar"
  });

  const list = createElement("ul", {
    class: "chat-list"
  });

  makeDraggableScroll(list);

  sidebar.appendChild(list);

  const chatView = createElement("div", {
    class: "chat-view"
  });

  wrapper.append(sidebar, chatView);
  contentContainer.appendChild(wrapper);

  try {
    const chats =
      await chatFetch("/api/v1/newchats/all");

    const currentUser = getState("user");

    if (!Array.isArray(chats) || chats.length === 0) {
      list.appendChild(
        createElement(
          "li",
          { class: "no-chats" },
          ["No chats found."]
        )
      );
      return;
    }

    let activeChatItem = null;

    chats.forEach(chat => {
      const chatItem = createChatListItem(
        chat,
        currentUser,
        () => {
          if (activeChatItem) {
            activeChatItem.classList.remove(
              "chat-item-active"
            );
          }

          chatItem.classList.add(
            "chat-item-active"
          );

          activeChatItem = chatItem;

          displayNewChat(
            chatView,
            chat.chatid,
            isLoggedIn,
            currentUser
          );
        }
      );

      list.appendChild(chatItem);
    });

    const firstChat = chats[0];

    if (firstChat?.chatid) {
      const firstItem =
        list.querySelector(".chat-item");

      if (firstItem) {
        firstItem.classList.add(
          "chat-item-active"
        );

        activeChatItem = firstItem;
      }

      displayNewChat(
        chatView,
        firstChat.chatid,
        isLoggedIn,
        currentUser
      );
    }
  } catch (err) {
    console.error(
      "Error loading chats:",
      err
    );

    list.appendChild(
      createElement(
        "li",
        { class: "chat-error" },
        ["Failed to load chats."]
      )
    );
  }
}

function createChatListItem(
  chat,
  currentUser,
  onClick
) {
  const otherUser =
    chat?.users?.find(
      user => user !== currentUser
    ) ?? "Unknown";

  const lastMsg =
    chat?.lastMessage?.text?.trim() ||
    "No messages yet";

  const timestamp = formatTimestamp(
    chat?.lastMessage?.timestamp
  );

  const li = createElement("li", {
    class: "chat-item",
    events: {
      click: onClick
    }
  });

  const avatar = createElement(
    "div",
    { class: "chat-avatar" },
    [
      otherUser
        .charAt(0)
        .toUpperCase()
    ]
  );

  const info = createElement("div", {
    class: "chat-info"
  });

  const name = createElement(
    "strong",
    { class: "chat-name" },
    [otherUser]
  );

  const preview = createElement(
    "div",
    { class: "chat-preview" },
    [lastMsg]
  );

  const time = createElement(
    "div",
    { class: "chat-time" },
    [timestamp]
  );

  info.append(name, preview);
  li.append(avatar, info, time);

  return li;
}

function formatTimestamp(timestamp) {
  if (
    !timestamp ||
    timestamp ===
      "0001-01-01T00:00:00Z"
  ) {
    return "";
  }

  const date = new Date(timestamp);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function clearContainer(container) {
  while (container.firstChild) {
    container.removeChild(
      container.firstChild
    );
  }
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