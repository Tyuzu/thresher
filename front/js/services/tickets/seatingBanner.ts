import Seatingx from "../../components/base/Seatingx.ts";
import { createElement } from "../../components/createElement.ts";
import { EntityType, PictureType } from "../../utils/imagePaths.ts";

/** Saeting section */
function createEventSeatmap(eventdata, isCreator) {
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

export function showSeatingBanner(eventdata, isCreator) {
  const seatMap = createElement("div", { class: "seatmap" }, [createEventSeatmap(eventdata, isCreator)]);
  return createElement("section", { class: "seatingcon" }, [seatMap]);
}