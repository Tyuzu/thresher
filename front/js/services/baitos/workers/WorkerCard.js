import { createElement } from "../../../components/createElement.js";
import { Button } from "../../../components/base/Button.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import { navigate } from "../../../routes/index.js";
import { getState } from "../../../state/state.js";
import Imagex from "../../../components/base/Imagex.js";
import { openHireWorkerModal } from "./WorkerModal.js"; // Import it!

export function HireWorkerCard(worker, isLoggedIn) {
  // Use passed param or fallback to global state
  const userLoggedIn = isLoggedIn !== undefined ? isLoggedIn : Boolean(getState("token"));
  const isSelf = getState("user") === worker.userId;

  const card = createElement("div", { class: "worker-card" });

  // Worker photo
  const photo = createElement("div", { class: "worker-photo" });
  const profileImg = Imagex({
    src: resolveImagePath(EntityType.WORKER, PictureType.THUMB, worker.avatar),
    classes: "profile-thumbnail",
    loading: "lazy",
    alt: `${worker.name || "Worker"}'s profile photo`
  });
  photo.appendChild(profileImg);

  // Helper to render lines
  function renderDetail(icon, text) {
    if (!text) return null;
    const cleanText = Array.isArray(text) ? text.join(", ") : String(text);
    return createElement("p", { class: "worker-card-detail" }, [
      createElement("span", { class: "detail-icon" }, [icon]),
      ` ${cleanText}`
    ]);
  }

  const details = createElement("div", { class: "worker-details" }, [
    createElement("h3", {}, [worker.name || "Unnamed Worker"]),
    renderDetail("📞", worker.phone),
    renderDetail("🎯", worker.preferredRoles),
    renderDetail("📍", worker.location),
    renderDetail("📝", worker.bio ? (worker.bio.length > 80 ? worker.bio.substring(0, 77) + "..." : worker.bio) : null),
    // Inside details layout:
    Button(
      "👁️ Quick View",
      `quick-${worker.baitoWorkerId}`,
      {
        click: (e) => {
          e.stopPropagation(); // Stop card click navigation
          openHireWorkerModal(worker);
        }
      },
      "btn btn-secondary"
    ),
    !isSelf && userLoggedIn
      ? Button(
        "View Profile",
        `hire-${worker.baitoWorkerId}`,
        {
          click: (e) => {
            e.stopPropagation();
            navigate(`/baitos/worker/${worker.baitoWorkerId}`);
          }
        },
        "btn btn-primary"
      )
      : !isSelf
        ? createElement("p", { class: "login-warning-text" }, ["🔒 Login to hire"])
        : createElement("span", { class: "badge self-profile-badge" }, ["Your Profile"])
  ].filter(Boolean));

  card.appendChild(photo);
  card.appendChild(details);

  card.addEventListener("click", () => navigate(`/baitos/worker/${worker.baitoWorkerId}`));

  return card;
}