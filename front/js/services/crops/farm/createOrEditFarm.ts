import { createElement } from "../../../components/createElement.js";
import { createFormGroup } from "../../../components/createFormGroupEnhanced.js";

export function createInputField(type, placeholder, value = "", required = false) {
  return createElement("input", {
    type,
    placeholder,
    value,
    required,
  });
}

export function createForm(fields, onSubmit, submitText = "Submit") {
  const form = createElement("form", { class: "create-section" });

  form.appendChild(createElement("h2", {}, ["Create Farm"]));

  fields.forEach(field => form.appendChild(field));

  const submitBtn = createElement("button", {
    type: "submit"
  }, [submitText]);

  form.appendChild(submitBtn);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const result = await onSubmit(form);

    if (result === true || result?.success) {
      form.reset();
    }
  });

  return form;
}

export function createFarmForm({ isEdit = false, farm = {}, onSubmit }) {
  const fieldsConfig = [
    {
      type: "text",
      id: "farm-name",
      label: "Name",
      value: farm.name || "",
      placeholder: "Farm Name",
      required: true
    },
    {
      type: "text",
      id: "farm-location",
      label: "Location",
      value: farm.location || "",
      placeholder: "Location",
      required: true
    },
    {
      type: "textarea",
      id: "farm-description",
      label: "Description",
      value: farm.description || "",
      placeholder: "Description",
      required: false,
      rows: 3
    },
    {
      type: "text",
      id: "farm-owner",
      label: "Owner",
      value: farm.owner || "",
      placeholder: "Owner",
      required: true
    },
    {
      type: "text",
      id: "farm-contact",
      label: "Contact",
      value: farm.contact || "",
      placeholder: "Contact",
      required: true
    },
    {
      type: "select",
      id: "farm-practice",
      label: "Farming Practice",
      value: farm.practice || "",
      options: [
        { value: "organic", label: "Organic" },
        { value: "conventional", label: "Conventional" },
        { value: "hydroponic", label: "Hydroponic" },
        { value: "regenerative", label: "Regenerative" }
      ]
    },

    // New availability picker
    {
      type: "availability",
      id: "farm-availability",
      label: "Availability",
      value: farm.availabilityTiming || {}
    },

    {
      type: "url",
      id: "farm-social",
      label: "Social Link",
      value: farm.social || "",
      placeholder: "Website / Social Link"
    }

    // {
    //   type: "file",
    //   id: "farm-gallery",
    //   label: "Gallery",
    //   accept: "image/*",
    //   multiple: true
    // }
  ];

  const fields = fieldsConfig.map(field => createFormGroup(field));

  const form = createForm(
    fields,
    async () => {
      const formData = new FormData();

      fieldsConfig.forEach(field => {
        const input = document.getElementById(field.id);

        if (!input) {
          return;
        }

        const key = field.id.replace("farm-", "");

        switch (field.type) {
          case "availability":
            // hidden input already contains JSON
            formData.append(key, input.value || "{}");
            break;

          case "file":
            if (input.files?.length) {
              Array.from(input.files).forEach(file => {
                formData.append(key, file);
              });
            }
            break;

          default:
            formData.append(key, input.value.trim());
            break;
        }
      });

      if (!isEdit) {
        formData.append("crops", JSON.stringify([]));
      }

      return await onSubmit(formData);
    },
    isEdit ? "Update Farm" : "Create Farm"
  );

  return form;
}