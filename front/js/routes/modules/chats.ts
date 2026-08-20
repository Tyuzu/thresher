export const chatsRoutes = [
  /* =======================================================
     CHATS
  ======================================================= */

  {
    path: "/merechats",
    component: () =>
      import(
        "../../pages/merechats/merechats.ts"
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
        "../../pages/newchats/newchats.ts"
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
        "../../pages/discord/discord.ts"
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
        "../../pages/merechats/merePage.ts"
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
        "../../pages/newchats/newChatPage.ts"
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
        "../../pages/discord/discordChannel.ts"
      ),
    functionName: "DiscordChannel",
    meta: {
      requiresAuth: true,
      title: "Discord Channel"
    }
  }
];