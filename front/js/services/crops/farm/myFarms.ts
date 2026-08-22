import { createElement } from "../../../components/createElement.js";
import { apiFetch } from "../../../api/api.js";

export async function displayMyFarm(container) {
  container.replaceChildren();

  const page = createElement("div", { class: "my-farms-page" }, [
    createElement("h2", {}, ["My Farm"]),
  ]);

  const content = createElement("div", { class: "my-farm-content" });

  page.appendChild(content);
  container.appendChild(page);

  try {
    const res = await apiFetch("/dash/farms");

    if (!res?.success || !res?.farm) {
      content.appendChild(
        createElement("p", {}, [
          res?.message || "You do not own any farms yet.",
        ])
      );
      return;
    }

    const farm = res.farm;
    const crops = Array.isArray(farm.crops) ? farm.crops : [];

    content.appendChild(
      createElement("div", { class: "farm-header" }, [
        createElement("h3", {}, [farm.name || "Unnamed Farm"]),
        createElement("p", {}, [farm.location || "No location"]),
        createElement("p", {}, [
          farm.practice
            ? `Practice: ${farm.practice}`
            : "Practice: N/A",
        ]),
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
                  `${crop.name} • ${crop.quantity} ${crop.unit} • ₹${Number(crop.price || 0).toFixed(2)}/${crop.unit}`,
                ])
              )
            )
          : createElement("p", {}, ["No crops listed yet."]),
      ])
    );
  } catch (err) {
    console.error("Failed to load farm:", err);

    content.appendChild(
      createElement("p", {}, ["Failed to load your farm."])
    );
  }
}