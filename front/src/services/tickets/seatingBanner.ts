import Seatingx from "../../components/base/Seatingx.js";
import { createElement } from "../../components/createElement.js";
import { EntityType, PictureType } from "../../utils/imagePaths.js";

export interface EventSeatingData {
  eventid: string | number;
  seating?: string;
  name?: string;
  [key: string]: unknown;
}

export interface SeatingxOptions {
  isCreator: boolean;
  bannerkey?: string;
  banneraltkey: string;
  bannerentitytype: EntityType;
  stateentitykey: string;
  bannerentityid: string | number;
  bannerPicType: PictureType;
}

/** Seating section */
function createEventSeatmap(eventdata: EventSeatingData, isCreator: boolean): HTMLElement {
  return Seatingx({
    isCreator: isCreator,
    bannerkey: eventdata.seating,
    banneraltkey: `Seating plan for ${eventdata.name || "Event"}`,
    bannerentitytype: EntityType.EVENT,
    stateentitykey: "event",
    bannerentityid: eventdata.eventid,
    bannerPicType: PictureType.SEATING,
  });
}

export function showSeatingBanner(eventdata: EventSeatingData, isCreator: boolean): HTMLElement {
  const seatMap = createElement("div", { class: "seatmap" }, [createEventSeatmap(eventdata, isCreator)]);
  return createElement("section", { class: "seatingcon" }, [seatMap]);
}