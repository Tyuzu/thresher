// createBaitoProfile.ts

import { createElement } from "../../../components/createElement";
import { navigate } from "../../../routes/navigate";
import { getWorker, createProfile, updateProfile } from "../api.js";
import { createFormGroup } from "../../../components/form/createFormGroupEnhanced";
import Button from "../../../components/base/Button";
import Notify from "../../../components/ui/Notify";

// ---------------------------------
// INTERFACES & TYPES
// ---------------------------------

interface FormFieldDefinition {
    label: string;
    type: "text" | "number" | "email" | "textarea" | "select" | "file";
    id: string;
    required?: boolean;
    placeholder?: string;
    options?: string[];
    accept?: string;
    multiple?: boolean;
    additionalProps?: {
        min?: number;
        maxlength?: number;
        [key: string]: any;
    };
    additionalNodes?: HTMLElement[];
    [key: string]: any;
}

interface WorkerProfileData {
    name?: string;
    age?: number | string;
    phone?: string;
    email?: string;
    location?: string;
    preferredRoles?: string | string[];
    category?: string;
    experience?: string;
    skills?: string;
    availability?: string;
    expectedWage?: number | string;
    languages?: string;
    bio?: string;
    [key: string]: any;
}

export async function displayCreateBaitoProfile(
    isLoggedIn: boolean,
    contentContainer: HTMLElement
): Promise<void> {
    await displayCreateOrEditBaitoProfile(isLoggedIn, contentContainer, "create", null);
}

export async function displayCreateOrEditBaitoProfile(
    isLoggedIn: boolean,
    contentContainer: HTMLElement,
    mode: "create" | "edit" = "create",
    workerId: string | number | null = null
): Promise<void> {
    contentContainer.replaceChildren();

    if (!isLoggedIn) {
        Notify("Login required.", { type: "warning", duration: 3000, dismissible: true });
        navigate("/login");
        return;
    }

    const section = createElement("div", { class: "create-section" }) as HTMLElement;
    const form = createElement("form", { "aria-label": `${mode === "create" ? "Create" : "Edit"} Worker Profile` }) as HTMLFormElement;
    const bioCounter = createElement("small", { class: "char-count", "aria-live": "polite" }) as HTMLElement;

    const fields: FormFieldDefinition[] = [
        { label: "Full Name", type: "text", id: "profile-name", required: true, placeholder: "e.g. Yuki Tanaka" },
        { label: "Age", type: "number", id: "profile-age", required: true, placeholder: "e.g. 22", additionalProps: { min: 16 } },
        { label: "Phone Number", type: "text", id: "profile-phone", required: true, placeholder: "e.g. 080-1234-5678" },
        { label: "Email", type: "email", id: "profile-email", placeholder: "e.g. yuki@example.com" },
        { label: "Location", type: "text", id: "profile-location", required: true, placeholder: "e.g. Shibuya, Tokyo" },
        { label: "Preferred Roles", type: "text", id: "profile-roles", required: true, placeholder: "e.g. Waiter, Cashier" },
        { label: "Preferred Industry", type: "select", id: "profile-category", required: true, options: ["Food & Beverage", "Retail", "Delivery", "Cleaning", "Hospitality", "Education", "Office", "IT"] },
        { label: "Experience", type: "textarea", id: "profile-experience", placeholder: "Previous work experience" },
        { label: "Skills / Certifications", type: "text", id: "profile-skills", placeholder: "e.g. Japanese N2, Cashier Certified" },
        { label: "Availability", type: "text", id: "profile-availability", placeholder: "e.g. Weekends, Evenings" },
        { label: "Expected Wage (Yen/hour)", type: "number", id: "profile-wage", placeholder: "e.g. 1200", additionalProps: { min: 1 } },
        { label: "Languages Spoken", type: "text", id: "profile-languages", placeholder: "e.g. Japanese, English" },
        { label: "Bio", type: "textarea", id: "profile-bio", placeholder: "Brief intro...", additionalProps: { maxlength: 500 }, additionalNodes: [bioCounter] },
        { label: "Additional Documents / Certificates", type: "file", id: "profile-documents", accept: ".pdf,.jpg,.png", multiple: true }
    ];

    // render form fields
    fields.forEach(f => form.appendChild(createFormGroup(f)));

    const bioInput = form.querySelector("#profile-bio") as HTMLTextAreaElement | null;
    if (bioInput) {
        bioInput.addEventListener("input", (e: Event) => {
            const target = e.target as HTMLTextAreaElement;
            bioCounter.textContent = `${target.value.length} / 500 characters`;
        });
    }

    // Prefill when editing
    if (mode === "edit" && workerId) {
        try {
                const worker = (await getWorker(workerId)) as WorkerProfileData;
            
            const setVal = (id: string, val: any) => {
                const el = form.querySelector(`#${id}`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
                if (el) el.value = val !== null && val !== undefined ? String(val) : "";
            };

            setVal("profile-name", worker.name);
            setVal("profile-age", worker.age);
            setVal("profile-phone", worker.phone);
            setVal("profile-email", worker.email);
            setVal("profile-location", worker.location);
            
            const rolesFormatted = Array.isArray(worker.preferredRoles)
                ? worker.preferredRoles.join(", ")
                : worker.preferredRoles || "";
            setVal("profile-roles", rolesFormatted);

            setVal("profile-category", worker.category);
            setVal("profile-experience", worker.experience);
            setVal("profile-skills", worker.skills);
            setVal("profile-availability", worker.availability);
            setVal("profile-wage", worker.expectedWage);
            setVal("profile-languages", worker.languages);
            setVal("profile-bio", worker.bio);
            
            bioCounter.textContent = `${worker.bio?.length || 0} / 500 characters`;
        } catch (_err) {
            Notify("Failed to load worker data for editing.", { type: "error", duration: 3000, dismissible: true });
        }
    } else {
        // Prefill from draft when creating
        const draft = JSON.parse(localStorage.getItem("baitoProfileDraft") || "{}") as Record<string, string>;
        Object.entries(draft).forEach(([key, value]) => {
            const el = form.querySelector(`#${key}`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
            if (el && el.type !== "file") {
                el.value = value;
            }
        });
    }

    const submitBtn = Button(
        mode === "create" ? "Create Profile" : "Update Profile", 
        "profile-submit-btn", 
        {}, 
        "btn btn-primary"
    ) as HTMLButtonElement;

    // Save draft for CREATE mode
    if (mode === "create") {
        form.addEventListener("input", () => {
            const draftData: Record<string, string> = {};
            fields.forEach(f => {
                const el = form.querySelector(`#${f.id}`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
                if (el && el.type !== "file") {
                    draftData[f.id] = el.value;
                }
            });
            localStorage.setItem("baitoProfileDraft", JSON.stringify(draftData));
        });
    }

    // Submit logic
    form.addEventListener("submit", async (e: Event) => {
        e.preventDefault();
        submitBtn.disabled = true;

        const formData = new FormData(form);
        const payload = new FormData();

        const rolesRaw = formData.get("profile-roles")?.toString() || "";
        const parsedRoles = rolesRaw.split(",").map(r => r.trim()).filter(Boolean);

        const requiredFields = {
            name: formData.get("profile-name")?.toString().trim() || "",
            age: formData.get("profile-age")?.toString().trim() || "",
            phone: formData.get("profile-phone")?.toString().trim() || "",
            location: formData.get("profile-location")?.toString().trim() || "",
            roles: parsedRoles,
            category: formData.get("profile-category")?.toString().trim() || "",
            bio: formData.get("profile-bio")?.toString().trim() || ""
        };

        if (Object.values(requiredFields).some(v => !v || (Array.isArray(v) && !v.length))) {
            Notify("Please fill all required fields.", { type: "warning", duration: 3000, dismissible: true });
            submitBtn.disabled = false;
            return;
        }

        if (Number(requiredFields.age) < 16) {
            Notify("Minimum age is 16.", { type: "warning", duration: 3000, dismissible: true });
            submitBtn.disabled = false;
            return;
        }

        Object.entries(requiredFields).forEach(([k, v]) => {
            if (Array.isArray(v)) {
                v.forEach(val => payload.append(k, val));
            } else {
                payload.append(k, String(v));
            }
        });

        // Append optional fields
        ["profile-email", "profile-experience", "profile-skills", "profile-availability", "profile-wage", "profile-languages"].forEach(id => {
            const val = formData.get(id)?.toString();
            if (val && val.trim()) {
                payload.append(id.replace("profile-", ""), val.trim());
            }
        });

        // Handle additional documents
        const fileInput = form.querySelector("#profile-documents") as HTMLInputElement | null;
        const documents = fileInput?.files;
        if (documents && documents.length > 0) {
            Array.from(documents).forEach(file => payload.append("documents", file));
        }

        try {
            if (mode === "create") {
                Notify("Creating profile...", { type: "info", duration: 3000, dismissible: true });
                await createProfile(payload);
                localStorage.removeItem("baitoProfileDraft");
                Notify("Profile created successfully!", { type: "success", duration: 3000, dismissible: true });
            } else {
                Notify("Updating profile...", { type: "info", duration: 3000, dismissible: true });
                await updateProfile(workerId as string | number, payload);
                Notify("Profile updated successfully!", { type: "success", duration: 3000, dismissible: true });
            }
            navigate("/baitos/hire");
        } catch (err: any) {
            Notify(`Error: ${err?.message || err || "Profile save failed."}`, { type: "error", duration: 3000, dismissible: true });
        } finally {
            submitBtn.disabled = false;
        }
    });

    form.appendChild(submitBtn);
    section.appendChild(createElement("h2", {}, [mode === "create" ? "Create Worker Profile" : "Edit Worker Profile"]));
    section.appendChild(form);
    contentContainer.appendChild(section);
}