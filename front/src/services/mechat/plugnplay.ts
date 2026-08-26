import { navigate } from "../../routes/navigate.js";
import { getState } from "../../state/state.js";
import { userNewChatInit } from "../newchat/newchats.js";
import { startMeChat } from "./api.js";

/* =========================
   TYPES & INTERFACES
========================= */

export interface ChatResponse {
    chatid: string | number;
    [key: string]: unknown;
}

export interface UserState {
    userid: string | number;
    [key: string]: unknown;
}

/* =========================
   MAIN FUNCTION
========================= */

export async function meChat(
    otherUserId: string | number,
    entityType: string,
    entityId: string | number
): Promise<void> {
    const user = getState("user") as UserState | undefined;
    const userId = user?.userid;

    if (!userId || !otherUserId) {
        return;
    }

    if (entityType === "user") {
        userNewChatInit(String(otherUserId));
        // navigate(`/merechats/${chat.chatid}`);
    } else {
        const participants = [userId, otherUserId];

        const chat = await startMeChat(participants, entityType, entityId);

        if (chat?.chatid) {
            navigate(`/merechats/${chat.chatid}`);
        }
    }
}