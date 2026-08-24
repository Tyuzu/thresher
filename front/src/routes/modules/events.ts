import { AppRoute } from "./routeTypes.js";

export const eventsRoutes: AppRoute[] = [
  /* =======================================================
     EVENTS
  ======================================================= */

  {
    path: "/events",
    component: () =>
      import(
        "../../pages/events/events.js"
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
        "../../pages/events/createEvent.js"
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
        "../../pages/artist/artists.js"
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
        "../../pages/artist/createArtist.js"
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
        "../../pages/vendors/vendors.js"
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
        "../../pages/music/musiv.js"
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
        "../../pages/events/eventTicketsPage.js"
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
        "../../pages/events/eventPage.js"
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
        "../../pages/artist/artistPage.js"
      ),
    functionName: "Artist",
    meta: {
      title: "Artist"
    }
  }
];