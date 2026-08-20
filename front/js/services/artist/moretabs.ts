import { displayFanMedia } from "../fanmade/ui/mediaGallery.ts";
import { displayMedia } from "../media/ui/mediaGallery.ts";
import { persistTabs } from "../../utils/persistTabs.ts";


export async function renderPostsTab(container, artistID, isLoggedIn) {
    const tabs = [
      { title: "Fanmade", id: "artist-fanmade", render: (c) => displayFanMedia(c, "fanmade", artistID, isLoggedIn) },
      { title: "Artist", id: "artist-posts", render: (c) => displayMedia(c, "artist", artistID, isLoggedIn) },
    ];
  
    persistTabs(container, tabs, `media-tabs:${artistID}`);
  }
  