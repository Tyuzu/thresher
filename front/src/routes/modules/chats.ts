import { AppRoute } from "./routeTypes.js";

export const chatsRoutes: AppRoute[] = [
  /* =======================================================
     CHATS
  ======================================================= */

  {
    path: "/merechats",
    component: () =>
      import(
        "../../pages/merechats/merechats.js"
      ),
    functionName: "MeChats",
    meta: {
      requiresAuth: true,
      title: "My Chats"
    }
  },

  {
    path: "/newchats",
    component: () =>
      import(
        "../../pages/newchats/newchats.js"
      ),
    functionName: "NewChats",
    meta: {
      requiresAuth: true,
      title: "New Chats"
    }
  },

  {
    path: "/discord",
    component: () =>
      import(
        "../../pages/discord/discord.js"
      ),
    functionName: "Discord",
    meta: {
      requiresAuth: true,
      title: "Discord"
    }
  },

  /* =======================================================
     DYNAMIC ROUTES
  ======================================================= */

  {
    path: "/merechats/:id",
    component: () =>
      import(
        "../../pages/merechats/merePage.js"
      ),
    functionName: "OneChatPage",
    meta: {
      requiresAuth: true,
      title: "Chat"
    }
  },

  {
    path: "/newchat/:id",
    component: () =>
      import(
        "../../pages/newchats/newChatPage.js"
      ),
    functionName: "NewChatPage",
    meta: {
      requiresAuth: true,
      title: "Chat"
    }
  },

  {
    path: "/discord/:guildId/:channelId",
    component: () =>
      import(
        "../../pages/discord/discordChannel.js"
      ),
    functionName: "DiscordChannel",
    meta: {
      requiresAuth: true,
      title: "Discord Channel"
    }
  }
];