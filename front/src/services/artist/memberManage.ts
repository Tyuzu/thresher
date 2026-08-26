// manageMembers.ts

import { updateMember } from "./api.js";
import { manageBandMembers } from "./createOrEditMembers.js";
import { createElement } from "../../components/createElement.js";
import Button from "../../components/base/Button.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import Imagex from "../../components/base/Imagex.js";
import { uploadFile } from "../media/api/mediaApi.js";
import { uid } from "../media/ui/mediaUploadForm.js";
import Notify from "../../components/ui/Notify.js";

// ---------------------------------
// INTERFACES & TYPES
// ---------------------------------

export interface BandMember {
    memberid: string | number;
    name?: string;
    role?: string;
    image?: string;
    dob?: string;
    [key: string]: any;
}

export interface Artist {
    artistid: string | number;
    members: BandMember[];
    [key: string]: any;
}

export interface UploadControlsResult {
    uploadBtn: HTMLElement;
    fileInput: HTMLInputElement;
}

interface UploadResponse {
    filename?: string;
    key?: string;
    extension?: string;
    [key: string]: any;
}

export function renderBandMembers(artist: Artist, isCreator: boolean): HTMLElement {
    const cards = artist.members.map(member => {
        const photo = resolveImagePath(EntityType.ARTIST, PictureType.THUMB, member.image);
        const img = Imagex({ src: photo, alt: member.name || "", classes: "member-photo" }) as HTMLElement;

        const info = createElement("div", { class: "member-info" }, [
            createElement("strong", {}, [member.name || ""]),
            createElement("span", {}, [member.role || ""]),
        ]);

        const children: HTMLElement[] = [img, info];

        if (isCreator) {
            const controls = createUploadControls(member, artist, img);
            children.push(controls.uploadBtn, controls.fileInput);
        }

        return createElement("div", { class: "member-card" }, children) as HTMLElement;
    });

    return createElement("div", { class: "band-members" }, [
        createElement("p", {}, [createElement("strong", {}, ["👥 Band Members:"])]),
        createElement("div", { class: "member-grid" }, cards)
    ]) as HTMLElement;
}

export function createUploadControls(member: BandMember, artist: Artist, img: HTMLElement): UploadControlsResult {
    const fileInput = createElement("input", {
        type: "file",
        accept: "image/*",
        style: "display:none"
    }) as HTMLInputElement;

    const uploadBtn = Button(
        "P",
        "",
        {
            click: () => fileInput.click()
        },
        "upload-member-btn edit-banner-pic"
    ) as HTMLElement;

    fileInput.addEventListener("change", async () => {
        const file = fileInput.files?.[0];

        if (!file) {
            return;
        }

        try {
            const uploaded = (await uploadFile({
                id: uid(),
                entityType: "artist",
                entityId: String(member.memberid),
                key: "member",
                file
            })) as UploadResponse;

            const filename = uploaded.filename || "";

            await updateMember(
                artist.artistid,
                member.memberid,
                {
                    image: filename
                }
            );

            if ("src" in img) {
                (img as HTMLImageElement).src =
                    resolveImagePath(
                        EntityType.ARTIST,
                        PictureType.THUMB,
                        filename
                    ) + `?t=${Date.now()}`;
            }

            Notify(`${member.name ?? "Member"}'s photo updated`, {
                type: "success",
                duration: 2500
            });
        } catch (err: any) {
            Notify(`Failed to upload photo: ${err.message}`, {
                type: "error",
                duration: 2500
            });
        }
    });

    return {
        uploadBtn,
        fileInput
    };
}

export function renderManageMembersButton(artistID: string | number, container: HTMLElement): HTMLElement {
    return Button("👥 Manage Band Members", "", {
        click: () => {
            const ref = document.getElementById("editartist") || container;
            manageBandMembers(artistID, ref);
        }
    }, "manage-members-btn buttonx secondary") as HTMLElement;
}