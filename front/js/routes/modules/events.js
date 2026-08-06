import { safeArgBuilder } from "../safeArgsBuilder.js";
export const eventsStaticRoutes = {
  "/create-artist": { moduleImport: () => import("../../pages/artist/createArtist.js"), functionName: "CreateArtist", protected: true },
  "/create-event": { moduleImport: () => import("../../pages/events/createEvent.js"), functionName: "CreateEvent", protected: true },
  "/events": { moduleImport: () => import("../../pages/events/events.js"), functionName: "Events" },
  "/artists": { moduleImport: () => import("../../pages/artist/artists.js"), functionName: "Artists" },
  "/vendors": { moduleImport: () => import("../../pages/vendors/vendors.js"), functionName: "Vendors" },
  "/music": { moduleImport: () => import("../../pages/music/musiv.js"), functionName: "Music" },
};

export const eventsDynamicRoutes = [
  {
    pattern: /^\/event\/([\w-]+)\/tickets$/,
    moduleImport: () => import("../../pages/events/eventTicketsPage.js"),
    functionName: "EventTickets",
    protected: true,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/event\/([\w-]+)$/,
    moduleImport: () => import("../../pages/events/eventPage.js"),
    functionName: "Event",
    protected: false,
    argBuilder: safeArgBuilder
  },
  {
    pattern: /^\/artist\/([\w-]+)$/,
    moduleImport: () => import("../../pages/artist/artistPage.js"),
    functionName: "Artist",
    protected: false,
    argBuilder: safeArgBuilder
  },
];