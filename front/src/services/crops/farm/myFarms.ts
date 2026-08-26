import { createElement } from "../../../components/createElement.js";
import { fetchMyFarms } from "../api.js";

export interface Crop {
  name?: string;
  quantity?: number | string;
  unit?: string;
  price?: number | string;
  [key: string]: any;
}

export interface MyFarm {
  farmid?: string | number;
  name?: string;
  location?: string;
  practice?: string;
  crops?: Crop[];
  [key: string]: any;
}

export interface MyFarmApiResponse {
  success: boolean;
  message?: string;
  farm?: MyFarm;
}

/**
 * Renders the dashboard view for the currently logged-in user's farm.
 *
 * @param container - Root DOM element to mount the view onto.
 */
export async function displayMyFarm(container: HTMLElement | null): Promise<void> {
  if (!container) return;

  container.replaceChildren();

  const page = createElement("div", { class: "my-farms-page" }, [
    createElement("h2", {}, ["My Farm"])
  ]) as HTMLElement;

  const content = createElement("div", { class: "my-farm-content" }) as HTMLElement;

  page.appendChild(content);
  container.appendChild(page);

  try {
    const res = (await fetchMyFarms()) as MyFarmApiResponse;

    if (!res?.success || !res?.farm) {
      content.appendChild(
        createElement("p", {}, [
          res?.message || "You do not own any farms yet."
        ])
      );
      return;
    }

    const farm = res.farm;
    const crops: Crop[] = Array.isArray(farm.crops) ? farm.crops : [];

    content.appendChild(
      createElement("div", { class: "farm-header" }, [
        createElement("h3", {}, [farm.name || "Unnamed Farm"]),
        createElement("p", {}, [farm.location || "No location"]),
        createElement("p", {}, [
          farm.practice
            ? `Practice: ${farm.practice}`
            : "Practice: N/A"
        ])
      ])
    );

    content.appendChild(
      createElement("div", { class: "farm-crops" }, [
        createElement("h3", {}, ["Crops"]),
        crops.length
          ? createElement(
              "ul",
              {},
              crops.map((crop) =>
                createElement("li", {}, [
                  `${crop.name || "Unnamed"} • ${crop.quantity ?? 0} ${crop.unit || ""} • ₹${Number(crop.price || 0).toFixed(2)}/${crop.unit || "unit"}`
                ])
              )
            )
          : createElement("p", {}, ["No crops listed yet."])
      ])
    );
  } catch (err) {
    console.error("Failed to load farm:", err);

    content.appendChild(
      createElement("p", {}, ["Failed to load your farm."])
    );
  }
}