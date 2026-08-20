export const eventsRoutes = [
  /* =======================================================
     EVENTS
  ======================================================= */

  {
    path: "/events",
    component: () =>
      import(
        "../../pages/events/events.ts"
      ),
    functionName: "Events",
    meta: {
      title: "Events"
    }
  },

  {
    path: "/create-event",
    component: () =>
      import(
        "../../pages/events/createEvent.ts"
      ),
    functionName: "CreateEvent",
    meta: {
      requiresAuth: true,
      title: "Create Event"
    }
  },

  /* =======================================================
     ARTISTS
  ======================================================= */

  {
    path: "/artists",
    component: () =>
      import(
        "../../pages/artist/artists.ts"
      ),
    functionName: "Artists",
    meta: {
      title: "Artists"
    }
  },

  {
    path: "/create-artist",
    component: () =>
      import(
        "../../pages/artist/createArtist.ts"
      ),
    functionName: "CreateArtist",
    meta: {
      requiresAuth: true,
      title: "Create Artist"
    }
  },

  /* =======================================================
     VENDORS & MUSIC
  ======================================================= */

  {
    path: "/vendors",
    component: () =>
      import(
        "../../pages/vendors/vendors.ts"
      ),
    functionName: "Vendors",
    meta: {
      title: "Vendors"
    }
  },

  {
    path: "/music",
    component: () =>
      import(
        "../../pages/music/musiv.ts"
      ),
    functionName: "Music",
    meta: {
      title: "Music"
    }
  },

  /* =======================================================
     DYNAMIC ROUTES
  ======================================================= */

  {
    path: "/event/:id/tickets",
    component: () =>
      import(
        "../../pages/events/eventTicketsPage.ts"
      ),
    functionName: "EventTickets",
    meta: {
      requiresAuth: true,
      title: "Event Tickets"
    }
  },

  {
    path: "/event/:id",
    component: () =>
      import(
        "../../pages/events/eventPage.ts"
      ),
    functionName: "Event",
    meta: {
      title: "Event"
    }
  },

  {
    path: "/artist/:id",
    component: () =>
      import(
        "../../pages/artist/artistPage.ts"
      ),
    functionName: "Artist",
    meta: {
      title: "Artist"
    }
  }
];