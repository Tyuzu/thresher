import { AppRoute } from "./routeTypes.js";

export const socialRoutes: AppRoute[] = [
  /* =======================================================
     POSTS
  ======================================================= */

  {
    path: "/posts",
    component: () =>
      import(
        "../../pages/posts/posts.js"
      ),
    functionName: "Posts",
    meta: {
      title: "Posts"
    }
  },

  {
    path: "/create-post",
    component: () =>
      import(
        "../../pages/posts/createNewPost.js"
      ),
    functionName: "CreatePost",
    meta: {
      requiresAuth: true,
      title: "Create Post"
    }
  },

  /* =======================================================
     DYNAMIC ROUTES
  ======================================================= */

  {
    path: "/post/:id",
    component: () =>
      import(
        "../../pages/posts/displayPost.js"
      ),
    functionName: "Post",
    meta: {
      title: "Post"
    }
  },

  {
    path: "/hashtag/:tag",
    component: () =>
      import(
        "../../pages/hashtag/hashtagPage.js"
      ),
    functionName: "Hashtag",
    meta: {
      title: "Hashtag"
    }
  }
];