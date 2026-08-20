export const socialRoutes = [
  /* =======================================================
     POSTS
  ======================================================= */

  {
    path: "/posts",
    component: () =>
      import(
        "../../pages/posts/posts.ts"
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
        "../../pages/posts/createNewPost.ts"
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
        "../../pages/posts/displayPost.ts"
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
        "../../pages/hashtag/hashtagPage.ts"
      ),
    functionName: "Hashtag",
    meta: {
      title: "Hashtag"
    }
  }
];