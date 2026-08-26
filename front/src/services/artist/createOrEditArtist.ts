// createOrEditArtist.ts

import { navigate } from "../../routes/navigate.js";
import { createArtist as apiCreateArtist, updateArtist as apiUpdateArtist, deleteArtist as apiDeleteArtist } from "./api.js";
import Button from "../../components/base/Button.js";
import { createFormGroup } from "../../components/form/createFormGroupEnhanced.js";
import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.js";

// ---------------------------------
// INTERFACES & TYPES
// ---------------------------------

export interface SocialLink {
    platform: string;
    url: string;
}

export interface ExistingArtist {
    category?: string;
    name?: string;
    bio?: string;
    dob?: string;
    place?: string;
    country?: string;
    genres?: string[];
    socials?: Record<string, string>;
    [key: string]: any;
}

export interface CreateOrEditArtistOptions {
    isLoggedIn: boolean;
    content: HTMLElement;
    mode?: "create" | "edit";
    artistID?: string | number | null;
    existingArtist?: ExistingArtist | null;
    isCreator?: boolean;
}

interface FormFieldConfig {
    type: "select" | "text" | "textarea" | "date" | "url";
    id: string;
    label: string;
    required?: boolean;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
}

// ------------------- CREATE ARTIST EXPORT -------------------
export function createArtist(isLoggedIn: boolean, content: HTMLElement): void {
    createOrEditArtist({ isLoggedIn, content, mode: "create" });
}

// ------------------- EDIT ARTIST EXPORT -------------------
export async function editArtist(
    isLoggedIn: boolean,
    content: HTMLElement,
    artistID: string | number,
    existingArtist: ExistingArtist,
    isCreator: boolean
): Promise<void> {
    createOrEditArtist({ isLoggedIn, content, mode: "edit", artistID, existingArtist, isCreator });
}

// ------------------- CREATE -------------------
async function submitArtistForm(section: HTMLElement): Promise<void> {
    const formData = collectFormData(section);
    try {
        const response = (await apiCreateArtist(formData)) as { artistid: string | number };
        Notify("Artist created successfully!", { type: "success", duration: 3000 });
        navigate(`/artist/${response.artistid}`);
    } catch (err: any) {
        Notify(`Failed to create artist: ${err.message}`, { type: "error", duration: 3000 });
    }
}

// ------------------- UPDATE -------------------
async function updateArtistForm(artistID: string | number, section: HTMLElement): Promise<void> {
    const formData = collectFormData(section);
    try {
        await apiUpdateArtist(artistID, formData);
        Notify("Artist updated successfully", { type: "success", duration: 3000 });
        navigate(`/artist/${artistID}`);
    } catch (err: any) {
        Notify(`Failed to update artist: ${err.message}`, { type: "error", duration: 3000 });
    }
}

// ------------------- CREATE OR EDIT ARTIST -------------------
export async function createOrEditArtist({
    isLoggedIn,
    content,
    mode = "create",
    artistID = null,
    existingArtist = null,
    isCreator = false
}: CreateOrEditArtistOptions): Promise<void> {
    if (!isLoggedIn) {
        Notify("Please log in to continue.", { type: "warning", duration: 3000 });
        navigate("/login");
        return;
    }

    if (mode === "edit" && !isCreator) {
        Notify("You are not authorized to edit this artist.", { type: "error", duration: 3000 });
        return;
    }

    content.replaceChildren();

    const section = createElement("div", { class: "create-section" }) as HTMLElement;
    const heading = createElement("h2", {}, [mode === "create" ? "Create Artist" : "Edit Artist"]);
    section.appendChild(heading);

    const formFields: FormFieldConfig[] = [
        {
            type: "select", id: "artist-category", label: "Artist Type", required: true,
            options: [
                { value: "", label: "Select a Type" },
                { value: "singer", label: "Singer" },
                { value: "band", label: "Band" },
                { value: "comedian", label: "Comedian" },
                { value: "actor", label: "Actor" },
                { value: "poet", label: "Poet" },
                { value: "musician", label: "Musician" },
                { value: "dancer", label: "Dancer" },
                { value: "magician", label: "Magician" },
                { value: "painter", label: "Painter" },
                { value: "photographer", label: "Photographer" },
                { value: "sculptor", label: "Sculptor" },
                { value: "other", label: "Other" }
            ]
        },
        { type: "text", id: "artist-name", label: "Artist Name", required: true, placeholder: "Enter artist name" },
        { type: "textarea", id: "artist-bio", label: "Artist's Biography", required: true, placeholder: "Write a short bio" },
        { type: "date", id: "artist-dob", label: "Date of Birth" },
        { type: "text", id: "artist-place", label: "Artist Place", required: true, placeholder: "City or place" },
        { type: "text", id: "artist-country", label: "Country", required: true, placeholder: "Country" },
        { type: "text", id: "artist-genres", label: "Genres (comma separated)", placeholder: "e.g., Jazz, Rock" },
    ];

    formFields.forEach(field => {
        const fieldKey = field.id.replace("artist-", "");
        let value: any = existingArtist?.[fieldKey] ?? "";
        if (field.id === "artist-genres" && existingArtist?.genres) {
            value = existingArtist.genres.join(", ");
        }
        const inputField = createFormGroup({ ...field, value }) as HTMLElement;
        section.appendChild(inputField);
    });

    // ------------------- SOCIAL LINKS SECTION -------------------
    const socialsContainer = createElement("div", { id: "artist-socials-container" }) as HTMLElement;
    const addSocialBtn = Button("Add Social", "add-social-btn", { click: () => addSocialField(null, socialsContainer) }, "buttonx secondary") as HTMLElement;
    const socialsSection = createElement("div", { class: "socials-section" }, [
        createElement("h3", {}, ["Social Links"]),
        socialsContainer,
        addSocialBtn
    ]);
    section.appendChild(socialsSection);

    if (mode === "edit" && existingArtist?.socials) {
        Object.entries(existingArtist.socials).forEach(([platform, url]) => {
            addSocialField({ platform, url }, socialsContainer);
        });
    }

    const submitBtn = Button(
        mode === "create" ? "Create Artist" : "Update Artist",
        "artist-submit-btn",
        {
            click: async (e: Event) => {
                e.preventDefault();
                if (mode === "create") {
                    await submitArtistForm(section);
                } else if (artistID !== null && artistID !== undefined) {
                    await updateArtistForm(artistID, section);
                }
            }
        },
        "buttonx primary"
    ) as HTMLElement;

    section.appendChild(submitBtn);
    content.appendChild(section);
}

// ------------------- SOCIAL FIELD -------------------
function addSocialField(existingSocial: SocialLink | null = null, container: HTMLElement): void {
    const row = createElement("div", { class: "social-field-row" }) as HTMLElement;

    const platformField = createFormGroup({
        type: "text",
        id: `social-platform-${existingSocial?.platform ?? ""}`,
        label: "Platform",
        required: true,
        value: existingSocial?.platform || "",
        placeholder: "e.g. Instagram"
    }) as HTMLElement;

    const urlField = createFormGroup({
        type: "url",
        id: `social-url-${existingSocial?.platform ?? ""}`,
        label: "URL",
        required: true,
        value: existingSocial?.url || "",
        placeholder: "https://..."
    }) as HTMLElement;

    const removeBtn = Button("Remove", "", { click: () => container.removeChild(row) }, "remove-social-btn") as HTMLElement;
    [platformField, urlField, removeBtn].forEach(el => row.appendChild(el));
    container.appendChild(row);
}

// ------------------- FORM DATA COLLECTOR -------------------
function collectFormData(section: HTMLElement): FormData {
    const formData = new FormData();

    ["artist-category", "artist-name", "artist-bio", "artist-dob", "artist-place", "artist-country", "artist-genres"].forEach(id => {
        const el = section.querySelector(`#${id}`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        if (el) {
            formData.append(id.replace("artist-", ""), el.value ?? "");
        }
    });

    // ---- Collect socials as JSON ----
    const socials: Record<string, string> = {};
    section.querySelectorAll(".social-field-row").forEach(row => {
        const platformInput = row.querySelector("input[type=text]") as HTMLInputElement;
        const urlInput = row.querySelector("input[type=url]") as HTMLInputElement;
        
        const platform = platformInput?.value.trim().toLowerCase();
        const url = urlInput?.value.trim();
        
        if (platform && url) {
            socials[platform] = url;
        }
    });
    
    if (Object.keys(socials).length > 0) {
        formData.append("socials", JSON.stringify(socials));
    }

    return formData;
}

// ------------------- DELETE ARTIST -------------------
export async function deleteArtistForm(
    isLoggedIn: boolean,
    artistID: string | number,
    isCreator: boolean
): Promise<void> {
    if (!isLoggedIn) {
        Notify("You must be logged in to delete an artist.", { type: "warning", duration: 3000 });
        navigate("/login");
        return;
    }

    if (!isCreator) {
        Notify("You are not authorized to delete this artist.", { type: "error", duration: 3000 });
        return;
    }

    const confirmed = confirm("Are you sure you want to delete this artist? This action cannot be undone.");
    if (!confirmed) {
        return;
    }

    try {
        await apiDeleteArtist(artistID);
        Notify("Artist deleted successfully.", { type: "success", duration: 3000 });
        navigate("/artists");
    } catch (err: any) {
        Notify(`Failed to delete artist: ${err.message}`, { type: "error", duration: 4000 });
    }
}