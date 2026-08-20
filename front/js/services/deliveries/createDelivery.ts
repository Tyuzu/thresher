import "../../../css/inistyles/deliverypage.css";
import { createElement } from "../../components/createElement.ts";
import { createFormGroup } from "../../components/createFormGroupEnhanced.ts";
import Button from "../../components/base/Button.ts";
import Notify from "../../components/ui/Notify.mjs";
import { createDeliveryRequest } from "../../services/deliveries/deliveriesApi.ts";
import { navigate } from "../../routes/index.ts";

async function CreateDelivery(container, isLoggedIn) {
  const contentContainer = (container && typeof container === "object" && container.nodeType)
    ? container
    : ((isLoggedIn && typeof isLoggedIn === "object" && isLoggedIn.nodeType) ? isLoggedIn : null);

  if (!contentContainer) {
    console.error("CreateDelivery: Missing DOM container element.");
    return;
  }

  contentContainer.innerHTML = "";

  // Dynamic form submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formElement = e.target;

    // Validate form inputs programmatically before sending network requests
    const inputs = Array.from(formElement.querySelectorAll("input, textarea, select"));
    let isFormValid = true;

    inputs.forEach((input) => {
      if (typeof input.validate === "function") {
        const isValid = input.validate();
        if (!isValid) isFormValid = false;
      }
    });

    if (!isFormValid) {
      Notify("Please correct the validation errors in the form.", { type: "error" });
      return;
    }

    const formData = new FormData(formElement);

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
  };

  // Reusable address validator callback
  const validateAddress = (val) => {
    if (!val || !val.trim()) return "Address is required.";
    if (val.trim().length < 5) return "Address must be at least 5 characters long.";
    return null;
  };

  // Reusable latitude/longitude validator callback
  const validateCoordinate = (val) => {
    if (val === "" || val === null || val === undefined) return null; // Optional field
    const num = Number(val);
    if (isNaN(num)) return "Must be a valid number.";
    return null;
  };

  // --- Form Group Declarations ---
  
  // Pickup Fields
  const pickupAddressGroup = createFormGroup({
    type: "text",
    id: "pickupAddress",
    name: "pickupAddress",
    label: "Pickup Address",
    placeholder: "Enter pickup location...",
    required: true,
    validator: validateAddress,
    validationTrigger: "both"
  });

  const pickupLatGroup = createFormGroup({
    type: "number",
    id: "pickupLat",
    name: "pickupLat",
    label: "Pickup Latitude (Optional)",
    placeholder: "e.g. 37.7749",
    validator: validateCoordinate,
    additionalProps: { step: "any" }
  });

  const pickupLngGroup = createFormGroup({
    type: "number",
    id: "pickupLng",
    name: "pickupLng",
    label: "Pickup Longitude (Optional)",
    placeholder: "e.g. -122.4194",
    validator: validateCoordinate,
    additionalProps: { step: "any" }
  });

  // Dropoff Fields
  const dropoffAddressGroup = createFormGroup({
    type: "textarea",
    id: "dropoffAddress",
    name: "dropoffAddress",
    label: "Dropoff Address",
    placeholder: "Enter full dropoff address details...",
    required: true,
    validator: validateAddress,
    validationTrigger: "both",
    additionalProps: { rows: "3" }
  });

  const dropoffLatGroup = createFormGroup({
    type: "number",
    id: "dropoffLat",
    name: "dropoffLat",
    label: "Dropoff Latitude (Optional)",
    placeholder: "e.g. 37.7749",
    validator: validateCoordinate,
    additionalProps: { step: "any" }
  });

  const dropoffLngGroup = createFormGroup({
    type: "number",
    id: "dropoffLng",
    name: "dropoffLng",
    label: "Dropoff Longitude (Optional)",
    placeholder: "e.g. -122.4194",
    validator: validateCoordinate,
    additionalProps: { step: "any" }
  });

  // Assemble Form DOM tree
  const form = createElement("form", {
    class: "delivery-form",
    events: { submit: handleSubmit }
  }, [
    createElement("h2", {}, ["Schedule New Delivery"]),

    // Pickup Details Section
    pickupAddressGroup,
    createElement("div", { class: "form-row" }, [
      pickupLatGroup,
      pickupLngGroup
    ]),

    // Dropoff Details Section
    dropoffAddressGroup,
    createElement("div", { class: "form-row" }, [
      dropoffLatGroup,
      dropoffLngGroup
    ]),

    Button("Submit Delivery Order", "btn-submit-delivery", {}, "btn-primary", { type: "submit" })
  ]);

  const pageWrapper = createElement("div", { class: "create-section" }, [
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