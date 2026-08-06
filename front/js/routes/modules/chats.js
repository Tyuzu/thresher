import { safeArgBuilder } from "../safeArgsBuilder.js";
export const chatsStaticRoutes = {
  "/merechats": { moduleImport: () => import("../../pages/merechats/merechats.js"), functionName: "MeChats", protected: true },
  "/newchats": { moduleImport: () => import("../../pages/newchats/newchats.js"), functionName: "NewChats", protected: true },
  "/discord": { moduleImport: () => import("../../pages/discord/discord.js"), functionName: "Discord", protected: true },
};

export const chatsDynamicRoutes = [
  {
    pattern: /^\/merechats\/([\w-]+)$/,
    moduleImport: () => import("../../pages/merechats/merePage.js"),
    functionName: "OneChatPage",
    protected: true,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/newchat\/([\w-]+)$/,
    moduleImport: () => import("../../pages/newchats/newChatPage.js"),
    functionName: "NewChatPage",
    protected: true,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/discord\/([\w-]+)\/([\w-]+)$/,
    moduleImport: () => import("../../pages/discord/discordChannel.js"),
    functionName: "DiscordChannel",
    protected: true,
    argBuilder: safeArgBuilder
  }
];