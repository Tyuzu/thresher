import "../../../css/inistyles/deliverypage.css";
import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import Notify from "../../components/ui/Notify.mjs";
import { createDeliveryRequest } from "../../services/deliveries/deliveriesApi.js";
import { navigate } from "../../routes/index.js";

async function CreateDelivery(container, isLoggedIn) {
  const contentContainer = (container && typeof container === "object" && container.nodeType)
    ? container
    : ((isLoggedIn && typeof isLoggedIn === "object" && isLoggedIn.nodeType) ? isLoggedIn : null);

  if (!contentContainer) {
    console.error("CreateDelivery: Missing DOM container element.");
    return;
  }

  contentContainer.innerHTML = "";

  const form = createElement("form", {
    class: "delivery-form",
    events: {
      submit: async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const payload = {
          pickup_loc: {
            address: formData.get("pickupAddress"),
            lat: parseFloat(formData.get("pickupLat") || 0),
            lng: parseFloat(formData.get("pickupLng") || 0)
          },
          dropoff_loc: {
            address: formData.get("dropoffAddress"),
            lat: parseFloat(formData.get("dropoffLat") || 0),
            lng: parseFloat(formData.get("dropoffLng") || 0)
          }
        };

        try {
          const res = await createDeliveryRequest(payload);
          const deliveryId = res?.deliveryid ?? res?.id;
          Notify("Delivery scheduled successfully!", { type: "success" });
          
          if (deliveryId) {
            navigate(`/delivery/${deliveryId}`);
          } else {
            navigate("/deliveries");
          }
        } catch (err) {
          Notify(err?.message || "Failed to schedule delivery", { type: "error" });
        }
      }
    }
  }, [
    createElement("h2", {}, ["Schedule New Delivery"]),
    
    // Pickup Group
    createElement("div", { class: "form-group" }, [
      createElement("label", { for: "pickupAddress" }, ["Pickup Address"]),
      createElement("input", { id: "pickupAddress", name: "pickupAddress", required: true, type: "text" })
    ]),
    createElement("div", { class: "form-row" }, [
      createElement("div", { class: "form-group" }, [
        createElement("label", { for: "pickupLat" }, ["Pickup Latitude (Optional)"]),
        createElement("input", { id: "pickupLat", name: "pickupLat", type: "number", step: "any" })
      ]),
      createElement("div", { class: "form-group" }, [
        createElement("label", { for: "pickupLng" }, ["Pickup Longitude (Optional)"]),
        createElement("input", { id: "pickupLng", name: "pickupLng", type: "number", step: "any" })
      ])
    ]),

    // Dropoff Group
    createElement("div", { class: "form-group" }, [
      createElement("label", { for: "dropoffAddress" }, ["Dropoff Address"]),
      createElement("textarea", { id: "dropoffAddress", name: "dropoffAddress", required: true, rows: "3" })
    ]),
    createElement("div", { class: "form-row" }, [
      createElement("div", { class: "form-group" }, [
        createElement("label", { for: "dropoffLat" }, ["Dropoff Latitude (Optional)"]),
        createElement("input", { id: "dropoffLat", name: "dropoffLat", type: "number", step: "any" })
      ]),
      createElement("div", { class: "form-group" }, [
        createElement("label", { for: "dropoffLng" }, ["Dropoff Longitude (Optional)"]),
        createElement("input", { id: "dropoffLng", name: "dropoffLng", type: "number", step: "any" })
      ])
    ]),

    Button("Submit Delivery Order", "btn-submit-delivery", {}, "btn-primary", { type: "submit" })
  ]);

  const pageWrapper = createElement("div", { class: "create-delivery-container" }, [
    createElement("button", {
      class: "back-link",
      events: { click: () => history.back() }
    }, ["← Back"]),
    form
  ]);

  contentContainer.appendChild(pageWrapper);
}

export { CreateDelivery, CreateDelivery as Createdelivery };
export default CreateDelivery;