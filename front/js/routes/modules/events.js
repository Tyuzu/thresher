import { authGuard } from "../../middleware/middleware.js";

export const eventsRoutes = [
  // Static
  {
    path: "/create-artist",
    component: () => import("../../pages/artist/createArtist.js"),
    functionName: "CreateArtist",
    middleware: [authGuard]
  },
  {
    path: "/create-event",
    component: () => import("../../pages/events/createEvent.js"),
    functionName: "CreateEvent",
    middleware: [authGuard]
  },
  {
    path: "/events",
    component: () => import("../../pages/events/events.js"),
    functionName: "Events"
  },
  {
    path: "/artists",
    component: () => import("../../pages/artist/artists.js"),
    functionName: "Artists"
  },
  {
    path: "/vendors",
    component: () => import("../../pages/vendors/vendors.js"),
    functionName: "Vendors"
  },
  {
    path: "/music",
    component: () => import("../../pages/music/musiv.js"),
    functionName: "Music"
  },

  // Dynamic
  {
    path: "/event/:id/tickets",
    component: () => import("../../pages/events/eventTicketsPage.js"),
    functionName: "EventTickets",
    middleware: [authGuard]
  },
  {
    path: "/event/:id",
    component: () => import("../../pages/events/eventPage.js"),
    functionName: "Event"
  },
  {
    path: "/artist/:id",
    component: () => import("../../pages/artist/artistPage.js"),
    functionName: "Artist"
  }
];