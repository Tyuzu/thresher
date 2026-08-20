// profilGen.js

import Button from "../../components/base/Button.ts";
import { getState } from "../../state/state.ts";
import { displayUserProfileData } from "./displayOtherUserProfile.ts";
import { createProfileDetails, createStatistics } from "./profileGenHelpers.ts";
import { createBanner } from "./bannerPicture.ts";
import { createAvatar } from "./avatarPicture.ts";
import { othusrdata } from "../userdata/otheruserdata.ts";
import { createElement } from "../../components/createElement.ts";

/* ============================================================
    HELPERS
============================================================ */

/** Helper function to append multiple child nodes safely */
function appendChildren(parent, ...children) {
  if (!parent) return;

  children.flat().forEach((child) => {
    if (child instanceof Node) {
      parent.appendChild(child);
    } else if (child) {
      console.error("Invalid child passed to appendChildren:", child);
    }
  });
}

/* ============================================================
    PROFILE GENERATOR COMPONENT
============================================================ */

function profilGen(profile = {}, isLoggedIn = false) {
  const currentUserId = getState("user")?.userid;
  const isCreator = Boolean(profile.userid && profile.userid === currentUserId);

  const profileContainer = createElement("div", {
    class: "profile-container hflex"
  });

  const section = createElement("section", {
    class: "channel vflex"
  });

  const suggs = createElement("section", {
    class: "followcon hflex"
  });

  // Append primary profile header elements
  appendChildren(
    section,
    createBanner(profile, isCreator),
    createAvatar(profile),
    createProfileDetails(profile, isLoggedIn),
    createStatistics(profile),
    suggs
  );

  // Render role-specific action or profile data sections
  if (isCreator) {
    const udata = createElement("div", { class: "udata-info" });
    const loadUserDataButton = Button("Load UserData", "load-user-data", {
      click: () => displayUserProfileData(isLoggedIn, udata, profile.userid)
    });

    appendChildren(section, loadUserDataButton, udata);
  } else {
    const kc = createElement("div");
    othusrdata(kc, profile.userid);
    appendChildren(section, kc);
  }

  profileContainer.appendChild(section);
  return profileContainer;
}

export default profilGen;