import "../../../css/inistyles/deliverypage.css";
import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import Notify from "../../components/ui/Notify.mjs";
import { createDeliveryRequest } from "../../services/deliveries/deliveriesApi.js";
import { navigate } from "../../routes/index.js";

async function CreateDelivery(isLoggedIn, contentContainer) {
  contentContainer.innerHTML = "";

  const form = createElement("form", {
    class: "delivery-form",
    events: {
      submit: async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const payload = Object.fromEntries(formData.entries());

        try {
          const res = await createDeliveryRequest(payload);
          Notify("Delivery scheduled successfully!", { type: "success" });
          navigate(`delivery/${res.deliveryid || res._id}`);
        } catch (err) {
          Notify(err?.message || "Failed to schedule delivery", { type: "error" });
        }
      }
    }
  }, [
    createElement("h2", {}, ["Schedule New Delivery"]),
    createElement("div", { class: "form-group" }, [
      createElement("label", { for: "recipientName" }, ["Recipient Name"]),
      createElement("input", { id: "recipientName", name: "recipientName", required: true, type: "text" })
    ]),
    createElement("div", { class: "form-group" }, [
      createElement("label", { for: "address" }, ["Delivery Address"]),
      createElement("textarea", { id: "address", name: "address", required: true, rows: "3" })
    ]),
    createElement("div", { class: "form-group" }, [
      createElement("label", { for: "phone" }, ["Phone Number"]),
      createElement("input", { id: "phone", name: "phone", required: true, type: "tel" })
    ]),
    createElement("div", { class: "form-group" }, [
      createElement("label", { for: "weight" }, ["Weight (kg)"]),
      createElement("input", { id: "weight", name: "weight", type: "number", step: "0.1" })
    ]),
    Button("Submit Delivery Order", "btn-submit-delivery", {}, "btn-primary", { type: "submit" })
  ]);

  const container = createElement("div", { class: "create-delivery-container" }, [
    createElement("button", {
      class: "back-link",
      events: { click: () => history.back() }
    }, ["← Back"]),
    form
  ]);

  contentContainer.appendChild(container);
}

export { CreateDelivery };
export default CreateDelivery;