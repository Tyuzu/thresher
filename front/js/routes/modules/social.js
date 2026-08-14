import { authGuard } from "../../middleware/middleware.js";

export const socialRoutes = [
  // Static
  {
    path: "/posts",
    component: () => import("../../pages/posts/posts.js"),
    functionName: "Posts"
  },
  {
    path: "/create-post",
    component: () => import("../../pages/posts/createNewPost.js"),
    functionName: "CreatePost",
    middleware: [authGuard]
  },

  // Dynamic
  {
    path: "/post/:id",
    component: () => import("../../pages/posts/displayPost.js"),
    functionName: "Post"
  },
  {
    path: "/hashtag/:tag",
    component: () => import("../../pages/hashtag/hashtagPage.js"),
    functionName: "Hashtag"
  }
];