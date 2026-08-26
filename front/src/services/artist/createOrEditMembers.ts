// createOrEditMembers.ts

import { navigate } from "../../routes/navigate.js";
import { getArtist, deleteMember, addMember, updateMember } from "./api.js";
import Button from "../../components/base/Button.js";
import { createFormGroup } from "../../components/form/createFormGroupEnhanced.js";
import { createElement } from "../../components/createElement.js";
import Notify from "../../components/ui/Notify.js";

// ---------------------------------
// INTERFACES & TYPES
// ---------------------------------

export interface BandMemberData {
    memberid?: string | number;
    name?: string;
    role?: string;
    dob?: string;
    image?: string;
    [key: string]: any;
}

export interface ArtistData {
    artistid?: string | number;
    name?: string;
    dob?: string;
    photo?: string;
    members?: BandMemberData[];
    [key: string]: any;
}

type MemberStatus = "unchanged" | "new" | "updated" | "removed";

// ENTRY
export async function manageBandMembers(artistID: string | number, container: HTMLElement): Promise<void> {
    container.replaceChildren();

    const heading = createElement("h2", {}, ["Manage Band Members"]) as HTMLElement;
    const membersContainer = createElement("div", { id: "band-members-container" }) as HTMLElement;

    const addBtn = Button(
        "Add Member",
        "add-member-btn",
        { click: () => addBandMember(null, membersContainer) },
        "buttonx",
        {}
    ) as HTMLElement;

    const saveBtn = Button(
        "Save Members",
        "save-members-btn",
        { click: () => saveBandMembers(artistID, membersContainer) },
        "buttonx",
        {}
    ) as HTMLElement;

    container.append(heading, membersContainer, addBtn, saveBtn);

    try {
        const artist = (await getArtist(artistID)) as ArtistData;
        (artist?.members || []).forEach(m =>
            addBandMember(m, membersContainer)
        );
    } catch {
        Notify("Failed to load members.", { type: "error", duration: 3000 });
    }
}

// SAVE ONLY CHANGES
async function saveBandMembers(artistID: string | number, container: HTMLElement): Promise<void> {
    const rows = container.querySelectorAll<HTMLElement>(".band-member");

    for (const row of rows) {
        const status = row.dataset.status as MemberStatus;
        const memberID = row.dataset.id || "";

        const name = row.querySelector<HTMLInputElement>("input[id^='member-name-']")?.value.trim() || "";
        const role = row.querySelector<HTMLInputElement>("input[id^='member-role-']")?.value.trim() || "";
        const dob = row.querySelector<HTMLInputElement>("input[id^='member-dob-']")?.value || "";
        const image = row.querySelector<HTMLInputElement>("input[id^='member-image-']")?.value || "";

        if (!name && status !== "removed") {
            Notify("Member name is required.", { type: "warning", duration: 2000 });
            return;
        }

        if (status === "removed") {
            if (!memberID.startsWith("new-")) {
                await deleteMember(artistID, memberID);
            }
            continue;
        }

        if (status === "new") {
            await addMember(artistID, {
                name,
                role,
                dob,
                image
            });
            continue;
        }

        if (status === "updated") {
            await updateMember(artistID, memberID, {
                name,
                role,
                dob,
                image
            });
        }
    }

    Notify("Members updated.", { type: "success", duration: 2500 });
    navigate(`/artist/${artistID}`);
}

// ADD / EDIT MEMBER ROW
function addBandMember(existing: BandMemberData | null, container: HTMLElement): void {
    if (!container) {
        return; 
    }

    const data = existing || {};
    const memberID = data.memberid || `new-${crypto.randomUUID()}`;

    const memberDiv = createElement("div", {
        class: "band-member",
        "data-id": String(memberID),
        "data-status": existing ? "unchanged" : "new"
    }) as HTMLElement;

    const refArtistField = createFormGroup({
        type: "text",
        id: `member-ref-${memberID}`,
        label: "Reference Artist ID (optional)",
        placeholder: "Paste artist ID to copy data",
        value: ""
    }) as HTMLElement;

    const nameField = createFormGroup({
        type: "text",
        id: `member-name-${memberID}`,
        label: "Member Name",
        required: true,
        placeholder: "Member name",
        value: data.name || ""
    }) as HTMLElement;

    const roleField = createFormGroup({
        type: "text",
        id: `member-role-${memberID}`,
        label: "Role (optional)",
        placeholder: "Role or instrument",
        value: data.role || ""
    }) as HTMLElement;

    const dobField = createFormGroup({
        type: "date",
        id: `member-dob-${memberID}`,
        label: "DOB (optional)",
        value: data.dob || ""
    }) as HTMLElement;

    // Hidden image field
    const imageField = createFormGroup({
        type: "hidden",
        id: `member-image-${memberID}`,
        value: data.image || ""
    }) as HTMLElement;

    const markUpdated = (): void => {
        if (memberDiv.dataset.status === "unchanged") {
            memberDiv.dataset.status = "updated";
        }
    };

    memberDiv.addEventListener("input", markUpdated);

    const fetchBtn = Button(
        "Fetch Artist Data",
        "",
        {
            click: () =>
                fetchMemberData(
                    refArtistField,
                    nameField,
                    roleField,
                    dobField,
                    imageField,
                    memberDiv
                )
        },
        "",
        {}
    ) as HTMLElement;

    const removeBtn = Button(
        "Remove",
        "",
        {
            click: () => {
                memberDiv.dataset.status = "removed";
                memberDiv.style.opacity = "0.4";
            }
        },
        "remove-member-btn buttonx",
        {}
    ) as HTMLElement;

    const refRow = createElement(
        "div",
        { class: "member-id-row" },
        [refArtistField, fetchBtn]
    );

    memberDiv.append(
        refRow,
        nameField,
        roleField,
        dobField,
        imageField,
        removeBtn
    );

    container.append(memberDiv);
}

// FETCH ARTIST → COPY INTO MEMBER
async function fetchMemberData(
    refField: HTMLElement, 
    nameField: HTMLElement, 
    roleField: HTMLElement, 
    dobField: HTMLElement, 
    imageField: HTMLElement, 
    row: HTMLElement
): Promise<void> {
    const artistID = refField.querySelector<HTMLInputElement>("input")?.value.trim();

    if (!artistID) {
        Notify("Enter an artist ID first.", { type: "warning", duration: 2000 });
        return;
    }

    try {
        const artist = (await getArtist(artistID)) as ArtistData;

        if (!artist?.name) {
            Notify("Artist not found.", { type: "error", duration: 2000 });
            return;
        }

        const nameInput = nameField.querySelector<HTMLInputElement>("input");
        if (nameInput) nameInput.value = artist.name || "";

        const dobInput = dobField.querySelector<HTMLInputElement>("input");
        if (dobInput) dobInput.value = artist.dob || "";

        // Copy artist photo → member image
        const imgInput = imageField.querySelector<HTMLInputElement>("input");
        if (imgInput) {
            imgInput.value = artist.photo || "";
        }

        if (row.dataset.status === "unchanged") {
            row.dataset.status = "updated";
        }

        Notify("Artist data copied.", { type: "success", duration: 1500 });
    } catch {
        Notify("Failed to fetch artist.", { type: "error", duration: 3000 });
    }
}