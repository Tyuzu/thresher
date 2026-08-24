import { meChat } from "../../mechat/plugnplay";

export async function farmChat(
    farmerId: string | number, 
    farmId: string | number
): Promise<void> {
    meChat(farmerId, "farm", farmId);
}