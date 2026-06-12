import Button from "../../components/base/Button.js";
import { createElement } from "../../components/createElement.js";
import { getState } from "../../state/state.js";
import { debounce } from "../../utils/deutils.js";
import { closeExistingSocket } from "./chatSocket.js";
import { t } from "./i18n.js";
import { safemereFetch, displayOneChat } from "./onechat.js";

/* -------------------------
   Search bar
--------------------------*/
export function createSearchBar(chatView) {
  const inputId = "chat-search-input";

  const label = createElement(
    "label",
    {
      for: inputId,
      class: "sr-only"
    },
    [t("chat.search")]
  );

  const input = createElement("input", {
    id: inputId,
    type: "search",
    class: "chat-search",
    placeholder: t("chat.search"),
    "aria-label": t("chat.search")
  });

  const handler = debounce(() => {
    const term = (input.value || "").trim().toLowerCase();

    if (!chatView) {
      return;
    }

    chatView.querySelectorAll(".message-item").forEach(item => {
      const content = item.querySelector(".msg-content");

      if (!content) {
        return;
      }

      const text = (content.textContent || "").toLowerCase();

      item.hidden = term ? !text.includes(term) : false;
    });
  }, 200);

  input.addEventListener("input", handler);

  return createElement(
    "div",
    {
      class: "search-bar",
      role: "search"
    },
    [label, input]
  );
}

/* -------------------------
   Chat list item
--------------------------*/
function createChatButton(chat, user, chatModal) {
  const participants = Array.isArray(chat.participants)
    ? chat.participants
    : [];

  const label =
    participants.filter(p => p !== user).join(", ") ||
    t("chat.unknown");

  const btn = Button(
    label,
    "",
    {},
    "chat-item-button"
  );

  btn.dataset.id = chat.chatid;

  btn.setAttribute("role", "button");
  btn.setAttribute(
    "aria-label",
    `${t("chat.with")} ${label}`
  );

  btn.addEventListener("click", async () => {
    closeExistingSocket("chat-switch");

    chatModal.classList.add("active");

    const backBtn = createElement(
      "button",
      {
        class: "chat-back-button",
        "aria-label": t("chat.back")
      },
      ["← ", t("chat.back")]
    );

    const chatBody = createElement("div", {
      class: "chat-body"
    });

    backBtn.addEventListener("click", () => {
      closeExistingSocket("back");
      chatModal.classList.remove("active");
      chatModal.replaceChildren();
    });

    chatModal.replaceChildren(backBtn, chatBody);

    await displayOneChat(chatBody, chat.chatid);
  });

  return btn;
}

/* -------------------------
   Chat list + infinite scroll
--------------------------*/
export async function loadChatList(
  listContainer,
  chatModal,
  reset = false
) {
  if (
    listContainer.dataset.loading === "true" ||
    listContainer.dataset.allLoaded === "true"
  ) {
    return;
  }

  if (reset) {
    listContainer.dataset.skip = "0";
    listContainer.dataset.allLoaded = "false";
    listContainer.replaceChildren();

    if (listContainer._observer) {
      listContainer._observer.disconnect();
      delete listContainer._observer;
    }

    delete listContainer._sentinel;
  }

  listContainer.dataset.loading = "true";
  listContainer.setAttribute("aria-busy", "true");

  const skip = Number(listContainer.dataset.skip || "0");
  const limit = 20;

  let chats = [];

  try {
    chats =
      (await safemereFetch(
        `/merechats/all?skip=${skip}&limit=${limit}`
      )) || [];
  } catch (e) {
    console.error("Failed to load chats", e);

    listContainer.appendChild(
      createElement(
        "p",
        { class: "error" },
        [t("chat.load_error")]
      )
    );

    listContainer.dataset.loading = "false";
    listContainer.setAttribute("aria-busy", "false");

    return;
  }

  listContainer
    .querySelectorAll(".empty-chats, .error")
    .forEach(el => el.remove());

  if (chats.length === 0 && skip === 0) {
    listContainer.appendChild(
      createElement(
        "p",
        { class: "empty-chats" },
        [t("chat.no_chats")]
      )
    );
  }

  const user = getState("user") || "";

  const existingIds = new Set(
    Array.from(
      listContainer.querySelectorAll("[data-id]")
    )
      .map(el => el.dataset.id)
      .filter(Boolean)
  );

  const fragment = document.createDocumentFragment();

  chats.forEach(chat => {
    if (
      !chat ||
      !chat.chatid ||
      existingIds.has(chat.chatid)
    ) {
      return;
    }

    fragment.appendChild(
      createChatButton(chat, user, chatModal)
    );
  });

  listContainer.appendChild(fragment);

  listContainer.dataset.skip = String(
    skip + chats.length
  );

  if (chats.length < limit) {
    listContainer.dataset.allLoaded = "true";
  }

  let sentinel = listContainer._sentinel;

  if (
    !sentinel &&
    listContainer.dataset.allLoaded !== "true"
  ) {
    sentinel = createElement("div", {
      class: "scroll-sentinel",
      "aria-hidden": "true"
    });

    listContainer._sentinel = sentinel;

    const observer = new IntersectionObserver(entries => {
      if (
        entries.some(entry => entry.isIntersecting) &&
        listContainer.dataset.loading !== "true" &&
        listContainer.dataset.allLoaded !== "true"
      ) {
        loadChatList(listContainer, chatModal);
      }
    });

    listContainer._observer = observer;
    observer.observe(sentinel);
  }

  if (sentinel) {
    listContainer.appendChild(sentinel);
  }

  if (
    listContainer.dataset.allLoaded === "true" &&
    listContainer._observer
  ) {
    listContainer._observer.disconnect();
  }

  listContainer.dataset.loading = "false";
  listContainer.setAttribute("aria-busy", "false");
}

/* -------------------------
   Main chat UI
--------------------------*/
export async function displayChats(
  contentContainer,
  isLoggedIn
) {
  contentContainer.replaceChildren();

  if (!isLoggedIn) {
    contentContainer.appendChild(
      createElement(
        "p",
        {
          "aria-live": "polite"
        },
        [t("chat.login_prompt")]
      )
    );

    return;
  }

  const wrapper = createElement("div", {
    class: "merechatcon",
    role: "application"
  });

  const sidebar = createElement("aside", {
    class: "chat-sidebar",
    role: "complementary"
  });

  const main = createElement("div", {
    class: "chat-main",
    role: "main"
  });

  const chatList = createElement("nav", {
    class: "chat-list",
    role: "navigation"
  });

  const chatView = createElement("section", {
    class: "chat-view",
    role: "region"
  });

  sidebar.append(chatList);
  main.append(
    createSearchBar(chatView),
    chatView
  );

  wrapper.append(sidebar, main);
  contentContainer.appendChild(wrapper);

  await loadChatList(chatList, chatView, true);
}