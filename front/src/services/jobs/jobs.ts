import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import Modal from "../../components/ui/Modal.js";
import Notify from "../../components/ui/Notify.js";
import { createFormGroup } from "../../components/form/createFormGroupEnhanced.js";
import { buildCard } from "../baitos/baitoslisting/JobCard.js";
import { createJob, fetchJobsByEntity } from "./api.js";

interface JobPayload {
  category: string;
  subcategory: string;
  title: string;
  description: string;
  location: string;
  wage: string;
}

interface JobItem {
  baitoid?: string | number;
  [key: string]: unknown;
}

interface JobsApiResponse {
  jobs?: JobItem[];
}

// --- Category → Roles Map (light version) ---
const jobCategoryMap: Record<string, string[]> = {
  Food: ["Waiter", "Cook", "Delivery", "Cleaning", "Dishwasher", "Barista"],
  Retail: ["Cashier", "Stock", "Floor Staff"],
  Logistics: ["Warehouse", "Driver", "Mover"],
  Hospitality: ["Housekeeping", "Front Desk", "Server"],
  Construction: ["Laborer", "Carpenter", "Painter"],
  IT: ["Support", "Junior Developer", "Web Admin"],
  Office: ["Clerical", "Assistant", "Reception"],
  Other: ["General Help", "Seasonal", "Misc"]
};

// --- Utility: populate select options ---
function populateSelect(select: HTMLSelectElement, options: string[], selected: string = ""): void {
  select.replaceChildren();

  const placeholder = createElement(
    "option",
    { value: "", disabled: true, selected: true },
    ["Select role type"]
  );
  select.appendChild(placeholder);

  options.forEach(opt => {
    const o = createElement("option", { value: opt }, [opt]);
    select.appendChild(o);
  });

  select.value = selected || "";
}

// --- Minimal Validator ---
function validateHirePayload(data: JobPayload): boolean {
  if (!data.title || !data.description || !data.category || !data.subcategory) {
    Notify("Please fill in required fields.", { type: "error", duration: 3000 });
    return false;
  }
  return true;
}

// --- Build form with category + subcategory ---
function buildHireForm(): HTMLFormElement {
  const form = createElement("form", { id: "hire-job-form", class: "create-section" }) as HTMLFormElement;

  // Category select
  const categoryGroup = createFormGroup({
    label: "Category",
    type: "select",
    id: "job-category-main",
    required: true,
    placeholder: "Select a category",
    options: Object.keys(jobCategoryMap).map(k => ({ value: k, label: k }))
  });

  // Subcategory select (role)
  const roleGroup = createFormGroup({
    label: "Role Type",
    type: "select",
    id: "job-category-sub",
    required: true,
    placeholder: "Select role type",
    options: []
  });

  const otherFields = [
    { label: "Title", type: "text", id: "job-title", placeholder: "Job Title", required: true },
    { label: "Description", type: "textarea", id: "job-description", placeholder: "Job Description", required: true },
    { label: "Location", type: "text", id: "job-location", placeholder: "Location" },
    { label: "Wage", type: "text", id: "job-wage", placeholder: "Wage" }
  ];

  const groups = otherFields.map(f => createFormGroup(f));

  form.append(
    categoryGroup,
    roleGroup,
    ...groups
  );

  const submitBtn = Button({
    title: "Create Job",
    type: "submit",
    classes: "buttonx btn-primary"
  });
  
  form.appendChild(submitBtn);

  return form;
}

// --- Hire Job Modal ---
export function jobsHire(container: HTMLElement, entityType: string, entityId: string | number): void {
  const form = buildHireForm();

  const subSelect = form.querySelector("#job-category-sub") as HTMLSelectElement;

  // Category change → update subcategory list
  const mainCategorySelect = form.querySelector("#job-category-main") as HTMLSelectElement;
  if (mainCategorySelect) {
    mainCategorySelect.addEventListener("change", (e: Event) => {
      const target = e.target as HTMLSelectElement;
      const selectedCat = target.value;
      const roles = jobCategoryMap[selectedCat] || [];
      if (subSelect) {
        populateSelect(subSelect, roles);
      }
    });
  }

  const { close: closeModal } = Modal({
    title: "Hire a Job",
    content: form,
    size: "medium",
    closeOnOverlayClick: true
  });

  form.addEventListener("submit", async (e: Event) => {
    e.preventDefault();

    const jobData: JobPayload = {
      category: (form.querySelector("#job-category-main") as HTMLSelectElement)?.value.trim() || "",
      subcategory: (form.querySelector("#job-category-sub") as HTMLSelectElement)?.value.trim() || "",
      title: (form.querySelector("#job-title") as HTMLInputElement)?.value.trim() || "",
      description: (form.querySelector("#job-description") as HTMLTextAreaElement)?.value.trim() || "",
      location: (form.querySelector("#job-location") as HTMLInputElement)?.value.trim() || "",
      wage: (form.querySelector("#job-wage") as HTMLInputElement)?.value.trim() || ""
    };

    if (!validateHirePayload(jobData)) {
      return;
    }

    try {
      const newJob = await createJob(entityType, entityId, jobData);

      if (!newJob || !newJob.baitoid) {
        throw new Error("Failed to create job");
      }

      const wrapper = container.querySelector(".places-wrapper");
      if (wrapper) {
          const card = buildCard(newJob as any);
        if (card) {
          wrapper.appendChild(card);
        }
      }

      Notify("Job created successfully!", { type: "success", duration: 3000 });
      closeModal();
    } catch (err: any) {
      Notify(`Error creating job: ${err?.message || "Unknown error"}`, { type: "error", duration: 5000 });
    }
  });
}

// --- Display Jobs ---
export async function displayPlaceJobs(
  container: HTMLElement,
  isCreator: boolean,
  _isLoggedIn: boolean,
  entityType: string,
  entityId: string | number
): Promise<void> {
  container.replaceChildren();

  const title = createElement("h2", {}, ["Jobs"]);
  const jobsContainer = createElement("div", { class: "places-wrapper grid" });

  const elements: HTMLElement[] = [title];

  if (isCreator) {
    const hireBtn = Button({
      title: "Hire",
      id: "hire-btn",
      classes: "buttonx btn-primary",
      events: {
        click: () => jobsHire(container, entityType, entityId)
      }
    });
    elements.push(hireBtn);
  }

  container.append(...elements, jobsContainer);

  try {
    const response = await fetchJobsByEntity(entityType, entityId);
    const jobs = Array.isArray(response?.jobs) ? response.jobs : [];

    if (jobs.length === 0) {
      jobsContainer.appendChild(
        createElement("p", { class: "no-jobs" }, ["No jobs yet."])
      );
      return;
    }

    const fragment = document.createDocumentFragment();
    jobs.forEach((job: JobItem) => {
        const card = buildCard(job as any);
      if (card) {
        fragment.appendChild(card);
      }
    });
    jobsContainer.appendChild(fragment);
  } catch {
    jobsContainer.appendChild(
      createElement("p", { class: "error-message" }, ["Failed to load jobs."])
    );
  }
}