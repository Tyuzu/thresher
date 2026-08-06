import { safeArgBuilder } from "../safeArgsBuilder.js";
export const socialStaticRoutes = {
  "/social": { moduleImport: () => import("../../pages/tumblr/tumblr.js"), functionName: "Tumblr", protected: true },
  "/posts": { moduleImport: () => import("../../pages/posts/posts.js"), functionName: "Posts" },
  "/create-post": { moduleImport: () => import("../../pages/posts/createNewPost.js"), functionName: "CreatePost", protected: true },
};

export const socialDynamicRoutes = [
  {
    pattern: /^\/post\/([\w-]+)$/,
    moduleImport: () => import("../../pages/posts/displayPost.js"),
    functionName: "Post",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/feedpost\/([\w-]+)$/,
    moduleImport: () => import("../../pages/feed/postDisplay.js"),
    functionName: "Post",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/hashtag\/([\w-]+)$/,
    moduleImport: () => import("../../pages/hashtag/hashtagPage.js"),
    functionName: "Hashtag",
    protected: false,
    argBuilder: safeArgBuilder
  }
];