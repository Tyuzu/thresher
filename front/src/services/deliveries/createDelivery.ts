import "../../../css/inistyles/deliverypage.css";
import { createElement } from "../../components/createElement.js";
import { createFormGroup } from "../../components/form/createFormGroupEnhanced.js";
import Button from "../../components/base/Button.js";
import Notify from "../../components/ui/Notify.js";
import { createDeliveryRequest } from "../../services/deliveries/deliveriesApi.js";
import { navigate } from "../../routes/navigate.js";

// --- INTERFACES & TYPES ---
interface ValidatableElement extends HTMLElement {
  validate?: () => boolean;
}

export async function CreateDelivery(
  container?: HTMLElement | null,
  isLoggedIn?: boolean | HTMLElement | null
): Promise<void> {
  const contentContainer = (container && typeof container === "object" && container.nodeType)
    ? container
    : ((isLoggedIn && typeof isLoggedIn === "object" && (isLoggedIn as HTMLElement).nodeType) ? (isLoggedIn as HTMLElement) : null);

  if (!contentContainer) {
    console.error("CreateDelivery: Missing DOM container element.");
    return;
  }

  contentContainer.innerHTML = "";

  // Dynamic form submit handler
  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const formElement = e.target as HTMLFormElement;

    // Validate form inputs programmatically before sending network requests
    const inputs = Array.from(formElement.querySelectorAll("input, textarea, select")) as ValidatableElement[];
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
        address: formData.get("pickupAddress") as string,
        lat: parseFloat((formData.get("pickupLat") as string) || "0"),
        lng: parseFloat((formData.get("pickupLng") as string) || "0")
      },
      dropoff_loc: {
        address: formData.get("dropoffAddress") as string,
        lat: parseFloat((formData.get("dropoffLat") as string) || "0"),
        lng: parseFloat((formData.get("dropoffLng") as string) || "0")
      }
    };

    try {
      const res: any = await createDeliveryRequest(payload);
      const deliveryId = res?.deliveryid ?? res?.id;
      Notify("Delivery scheduled successfully!", { type: "success" });

      if (deliveryId) {
        navigate(`/delivery/${deliveryId}`);
      } else {
        navigate("/deliveries");
      }
    } catch (err: any) {
      Notify(err?.message || "Failed to schedule delivery", { type: "error" });
    }
  };

  // Reusable address validator callback
  const validateAddress = (val: any): string | null => {
    const strVal = String(val || "");
    if (!strVal.trim()) return "Address is required.";
    if (strVal.trim().length < 5) return "Address must be at least 5 characters long.";
    return null;
  };

  // Reusable latitude/longitude validator callback
  const validateCoordinate = (val: any): string | null => {
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

  // Submit Button using the object-configuration syntax
  const submitButton = Button({
    title: "Submit Delivery Order",
    id: "btn-submit-delivery",
    classes: "btn-primary",
    attributes: { type: "submit" }
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

    submitButton
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

export default CreateDelivery;