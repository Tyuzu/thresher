import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import { payViaStripe } from "../pay/pay.js";

import { getState } from "../../state/state.js";
import Imagex from "../../components/base/Imagex.js";
import { EntityType } from "../../utils/imagePaths.js";

/* ---------------------- TYPES ---------------------- */
export interface UserProfileOptions {
  username?: string;
  bio?: string;
  avatarUrl?: string;
  postCount?: number;
  isFollowing?: boolean;
  entityType?: string;
  entityId?: string | number | null;
  entityName?: string;
}

export interface UserState {
  userid?: string | number;
  username?: string;
  [key: string]: unknown;
}

export interface PaymentResult {
  success?: boolean;
  [key: string]: unknown;
}

const DEFAULT_PROFILE: Required<UserProfileOptions> = {
  username: "Anonymous",
  bio: "This user hasn't added a bio yet.",
  avatarUrl: "default-avatar.png",
  postCount: 0,
  isFollowing: false,
  entityType: EntityType.USER,
  entityId: null,
  entityName: "Anonymous"
};

// --- Main Export ---
export async function userProfileCard(
  options: UserProfileOptions = {}
): Promise<HTMLElement> {
  const profile = { ...DEFAULT_PROFILE, ...options };

  const card = createElement("div", { class: "user-profile-card" });

  const avatar = Imagex({
    src: profile.avatarUrl,
    alt: `${profile.username}'s avatar`,
    classes: "avatar",
    loading: "lazy"
  });

  const name = createElement("h3", {}, [profile.username]);
  const bio = createElement("p", { class: "bio" }, [profile.bio]);

  const elements: HTMLElement[] = [avatar, name, bio];

  const currentUserState = getState("user") as UserState | undefined;
  const currentUserId = currentUserState?.userid;

  // Funding button (only if not the logged-in user)
  if (profile.username !== currentUserId && profile.username !== currentUserState?.username) {
    const fundButton = Button({
      title: "Fund",
      id: "fund-btn",
      classes: "buttonx",
      events: {
        click: async () => {
          if (!profile.entityId) {
            alert("Funding not available.");
            return;
          }

          try {
            // Map entity types to valid fundable types
            let fundableType: string = profile.entityType;
            if (fundableType === EntityType.BLOGPOST) {
              fundableType = "creator";
            } else if (!fundableType || fundableType === EntityType.USER) {
              fundableType = EntityType.ARTIST;
            }

            const result = (await payViaStripe({
              paymentType: "funding",
              entityType: fundableType,
              entityId: profile.entityId
            })) as PaymentResult | undefined;

            if (result && result.success === true) {
              alert("Funding successful.");
            }
          } catch (err) {
            console.error("Funding failed:", err);
          }
        }
      }
    });

    const count = createElement("p", { class: "post-count" }, [
      `Posts: ${profile.postCount}`
    ]);

    elements.push(count, fundButton);

    if (profile.entityType === EntityType.USER) {
      const followBtn = createElement(
        "button",
        {
          class: "btn btn-outline",
          events: {
            click: () => {
              profile.isFollowing = !profile.isFollowing;
              followBtn.textContent = profile.isFollowing ? "Unfollow" : "Follow";
            }
          }
        },
        [profile.isFollowing ? "Unfollow" : "Follow"]
      ) as HTMLButtonElement;

      elements.push(followBtn);
    }
  }

  card.append(...elements);
  return card;
}