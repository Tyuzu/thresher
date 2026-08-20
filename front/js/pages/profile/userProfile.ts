import "../../../css/inistyles/profilexx.css";
import "../../../css/inistyles/udata.css";
import { displayProfile  } from "../../services/profile/displayMyProfile";
import { displayUserProfile  } from "../../services/profile/displayOtherUserProfile";

async function MyProfile(isLoggedIn, contentContainer, k) {
    contentContainer.innerHTML = "";
    const content = document.createElement("div");
    content.classList = "profilepage";
    contentContainer.appendChild(content);
    displayProfile(isLoggedIn, content);
}

async function UserProfile(isLoggedIn,  username, contentContainer) {
    contentContainer.innerHTML = "";
    const content = document.createElement("div");
    content.classList = "profilepage";
    contentContainer.appendChild(content);
    displayUserProfile(isLoggedIn, content, username);
}

export { MyProfile, UserProfile  };
