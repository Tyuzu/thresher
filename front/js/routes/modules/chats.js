import { authGuard } from "../../middleware/middleware.js";

export const chatsRoutes = [
  // Static
  {
    path: "/merechats",
    component: () => import("../../pages/merechats/merechats.js"),
    functionName: "MeChats",
    middleware: [authGuard]
  },
  {
    path: "/newchats",
    component: () => import("../../pages/newchats/newchats.js"),
    functionName: "NewChats",
    middleware: [authGuard]
  },
  {
    path: "/discord",
    component: () => import("../../pages/discord/discord.js"),
    functionName: "Discord",
    middleware: [authGuard]
  },

  // Dynamic
  {
    path: "/merechats/:id",
    component: () => import("../../pages/merechats/merePage.js"),
    functionName: "OneChatPage",
    middleware: [authGuard]
  },
  {
    path: "/newchat/:id",
    component: () => import("../../pages/newchats/newChatPage.js"),
    functionName: "NewChatPage",
    middleware: [authGuard]
  },
  {
    path: "/discord/:guildId/:channelId",
    component: () => import("../../pages/discord/discordChannel.js"),
    functionName: "DiscordChannel",
    middleware: [authGuard]
  }
];