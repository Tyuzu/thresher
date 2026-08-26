// displayArtist.ts

import {
    renderMerchTab,
    renderEventsTab,
    renderAlbumsTab
} from "./artistTabs.js";
import { renderSongsTab } from "./artistSongsTab.js";
import { getArtist } from "./api.js";
import { deleteArtistForm } from "./createOrEditArtist.js";
import { createOrEditArtist, ExistingArtist } from "./createOrEditArtist.js";
import { createElement } from "../../components/createElement.js";
import { reportEntity } from "../reporting/reporting.js";
import Button from "../../components/base/Button.js";
import { toggleAction } from "../beats/toggleFollows.js";
import { getState } from "../../state/state.js";
import { persistTabs } from "../../utils/persistTabs.js";
import { resolveImagePath, EntityType, PictureType } from "../../utils/imagePaths.js";
import { updateImageWithCrop } from "../../utils/bannerEditor.js";
import Imagex from "../../components/base/Imagex.js";
import { renderPostsTab } from "./moretabs.js";
import { displayNotices } from "../notices/notices.js";
import { renderBandMembers, renderManageMembersButton } from "./memberManage.js";
import { blueskySVG, facebookSVG, instagramSVG, soundcloudSVG, spotifySVG, tiktokSVG, twitterSVG, xitterSVG, youtubeSVG } from "../../components/svgs/socialSVGs.js";
import { createIconButton } from "../../utils/svgIconButton.js";
import { payViaStripe } from "../pay/pay.js";

// ---------------------------------
// INTERFACES & TYPES
// ---------------------------------

export interface ArtistProfile extends ExistingArtist {
    artistid: string | number;
    creatorid?: string | number;
    subscribed?: boolean;
    banner?: string;
    photo?: string;
    members?: any[];
    [key: string]: any;
}

interface TabConfig {
    title: string;
    id: string;
    render: (container: HTMLElement) => Promise<HTMLElement | void> | HTMLElement | void;
}

// --- CREATOR-ONLY BANNER SECTION ---
function createArtistBannerSection(artist: ArtistProfile, isCreator: boolean): HTMLElement {
    const bannerSection = createElement("div", { class: "artist-banner" }) as HTMLElement;
    const bannerSrc = resolveImagePath(EntityType.ARTIST, PictureType.BANNER, artist.banner || "") || "";

    const bannerImage = Imagex({
        id: "artist-banner-img",
        src: bannerSrc,
        alt: `Banner for ${artist.name || "Artist"}`,
        classes: "artist-banner"
    }) as HTMLElement;

    bannerSection.appendChild(bannerImage);

    if (isCreator) {
        const bannerEditButton = createElement("button", { class: "edit-banner-pic" }, ["Edit Banner"]) as HTMLButtonElement;
        bannerEditButton.addEventListener("click", () => {
            updateImageWithCrop({
                entityType: EntityType.ARTIST,
                imageType: "banner",
                stateKey: "banner",
                stateEntityKey: "artist",
                previewElementId: "artist-banner-img",
                pictureType: PictureType.BANNER,
                entityId: artist.artistid
            });
        });
        bannerSection.appendChild(bannerEditButton);
    }

    return bannerSection;
}

// --- CREATOR-ONLY PHOTO SECTION ---
function createArtistPhotoSection(artist: ArtistProfile, isCreator: boolean): HTMLElement {
    const photoSection = createElement("div", { class: "artist-photo" }) as HTMLElement;
    const photoSrc = resolveImagePath(EntityType.ARTIST, PictureType.THUMB, artist.photo || "") || "";

    const photoImg = Imagex({
        id: "artist-avatar-img",
        src: photoSrc,
        alt: `${artist.name || "Artist"}'s photo`,
        classes: "artist-photo"
    }) as HTMLElement;

    photoSection.appendChild(photoImg);

    if (isCreator) {
        const photoEditButton = createElement("button", { class: "edit-banner-pic" }, ["Edit Photo"]) as HTMLButtonElement;
        photoEditButton.addEventListener("click", () => {
            updateImageWithCrop({
                entityType: EntityType.ARTIST,
                imageType: "photo",
                stateKey: "photo",
                stateEntityKey: "artist",
                previewElementId: "artist-avatar-img",
                pictureType: PictureType.PHOTO,
                entityId: artist.artistid
            });
        });
        photoSection.appendChild(photoEditButton);
    }

    return photoSection;
}

// --- MAIN DISPLAY ---
export async function displayArtist(content: HTMLElement, artistID: string | number, isLoggedIn: boolean): Promise<void> {
    content.replaceChildren();
    const contentContainer = createElement("div", { class: "artistpage" }) as HTMLElement;
    content.appendChild(contentContainer);

    try {
        const artist = (await getArtist(artistID)) as ArtistProfile;
        if (!artist) {
            contentContainer.appendChild(createElement("p", {}, ["Artist not found."]));
            return;
        }

        const userState = getState("user") as { userid?: string | number };
        const user = userState?.userid;
        const isCreator = isLoggedIn && artist.creatorid === user;
        const isSubscribed = artist.subscribed === true;

        // --- PHOTO & BANNER ROW ---
        const photoBannerRow = createElement("div", { class: "hflex-sb photocon" }) as HTMLElement;
        const photoSection = createArtistPhotoSection(artist, isCreator);
        if (photoSection) {
            photoBannerRow.appendChild(photoSection);
        }
        photoBannerRow.appendChild(createArtistBannerSection(artist, isCreator));
        contentContainer.appendChild(photoBannerRow);

        // --- BUTTONS ---
        const buttonRow = createElement("div", { class: "hflex hcen" }) as HTMLElement;

        const subscribeButton = Button(isSubscribed ? "Unsubscribe" : "Subscribe", "", {
            click: () => SubscribeToArtist(subscribeButton as HTMLButtonElement, artist.artistid)
        }, "buttonx") as HTMLButtonElement;

        const reportButton = Button("Report", "report-btn", {
            click: () => reportEntity(String(artistID), "artist")
        }, "buttonx") as HTMLElement;

        const fundBtn = Button(
            "Fund Artist",
            "fund-artist-btn",
            {
                click: async () => {
                    try {
                        const result = (await payViaStripe({
                            paymentType: "funding",
                            entityType: "artist",
                            entityId: artist.artistid
                        })) as { success?: boolean };

                        if (!result || result.success !== true) {
                            console.error("Artist funding failed or was cancelled");
                            return;
                        }
                    } catch (err) {
                        console.error("Artist funding failed:", err);
                    }
                }
            },
            "buttonx secondary"
        ) as HTMLElement;

        buttonRow.append(subscribeButton, reportButton, fundBtn);

        if (isCreator) {
            const editDiv = createElement("div", { class: "editdiv", id: "editevent" });
            buttonRow.appendChild(editDiv);
        }

        contentContainer.appendChild(buttonRow);

        // --- BASE TABS ---
        const baseTabs: TabConfig[] = [
            { title: "Overview", id: "artist-overview", render: (c) => renderOverviewTab(c, artist, isCreator, isLoggedIn) },
            { title: "Events", id: "artist-events", render: (c) => renderEventsTab(c, artistID, isCreator) },
            { title: "Posts", id: "artist-posts", render: (c) => renderPostsTab(c, artistID, isLoggedIn) },
            {
                title: "Notices",
                id: "notices-tab",
                render: (tabContainer) => {
                    displayNotices("artist", artistID, tabContainer, isCreator);
                }
            },
        ];

        // --- CATEGORY-BASED TABS ---
        const categoryTabs: Record<string, TabConfig[]> = {
            singer: [
                { title: "Songs", id: "songs", render: (c) => renderSongsTab(c, artistID, isCreator) },
                { title: "Merch", id: "artist-merch", render: (c) => renderMerchTab(c, artistID, isCreator, isLoggedIn) }
            ],
            band: [
                { title: "Merch", id: "artist-merch", render: (c) => renderMerchTab(c, artistID, isCreator, isLoggedIn) },
                { title: "Songs", id: "songs", render: (c) => renderSongsTab(c, artistID, isCreator) },
            ],
            rapper: [
                { title: "Tracks", id: "songs", render: (c) => renderSongsTab(c, artistID, isCreator) },
                { title: "Merch", id: "artist-merch", render: (c) => renderMerchTab(c, artistID, isCreator, isLoggedIn) }
            ],
            composer: [
                { title: "Compositions", id: "songs", render: (c) => renderSongsTab(c, artistID, isCreator) }
            ],
            musician: [
                { title: "Songs", id: "songs", render: (c) => renderSongsTab(c, artistID, isCreator) },
                { title: "Merch", id: "artist-merch", render: (c) => renderMerchTab(c, artistID, isCreator, isLoggedIn) }
            ],
            painter: [
                { title: "Gallery", id: "artist-gallery", render: (c) => renderMerchTab(c, artistID, isCreator, isLoggedIn) }
            ],
            default: [
                { title: "Merch", id: "artist-merch", render: (c) => renderMerchTab(c, artistID, isCreator, isLoggedIn) }
            ]
        };

        const cat = artist.category?.toLowerCase() || "default";
        const tabs = [...baseTabs, ...(categoryTabs[cat] || categoryTabs.default)];

        persistTabs(contentContainer, tabs, `artist-tabs:${artistID}`);

    } catch (error: any) {
        contentContainer.replaceChildren();
        contentContainer.appendChild(
            createElement("p", {}, [`Error loading artist profile: ${error.message}`])
        );
    }
}

// --- SOCIAL ICON ---
function getSocialIcon(platform: string): string {
    const lc = platform.toLowerCase();
    const icons: Record<string, string> = {
        instagram: instagramSVG,
        twitter: twitterSVG,
        youtube: youtubeSVG,
        facebook: facebookSVG,
        tiktok: tiktokSVG,
        spotify: spotifySVG,
        soundcloud: soundcloudSVG,
        bluesky: blueskySVG,
        x: xitterSVG,
        website: "🌐",
        link: "🔗"
    };
    for (const key in icons) {
        if (lc.includes(key)) {
            return icons[key];
        }
    }
    return icons.link;
}

// --- SUBSCRIBE ---
function SubscribeToArtist(followBtn: HTMLButtonElement, artistId: string | number): void {
    toggleAction({
        entityId: artistId,
        entityType: "artist",
        button: followBtn,
        apiPath: "/subscribes/",
        labels: { on: "Unsubscribe", off: "Subscribe" },
        actionName: "subscribed"
    });
}

function renderOverviewTab(container: HTMLElement, artist: ArtistProfile, isCreator: boolean, isLoggedIn: boolean): void {
    const artistDiv = createElement("div", { class: "artist-container" }) as HTMLElement;

    if (isCreator) {
        artistDiv.appendChild(renderCreatorActions(artist, container, isLoggedIn));
    }
    artistDiv.appendChild(createElement("h2", { class: "artist-name" }, [artist.name || "Unknown Artist"]));
    artistDiv.appendChild(renderArtistDetails(artist));
    
    if (artist.socials) {
        artistDiv.appendChild(renderSocialLinks(artist.socials));
    }
    if (isCreator && artist.category?.toLowerCase() === "band") {
        artistDiv.appendChild(renderManageMembersButton(artist.artistid, container));
    }
    if (artist.members && artist.members.length > 0) {
        artistDiv.appendChild(renderBandMembers(artist as any, isCreator));
    }
    
    renderAlbumsTab(artist.artistid, isCreator)
        .then(c => {
            if (c) {
                artistDiv.appendChild(c);
            }
        });

    container.appendChild(artistDiv);
}

function renderArtistDetails(artist: ArtistProfile): HTMLElement {
    const detailsDiv = createElement("div", { class: "artist-details" }) as HTMLElement;

    const fields = [
        { label: "🎨 Artist Type", value: artist.category || "Unknown" },
        { label: "📖 Biography", value: artist.bio || "No biography available" },
        { label: "🎂 Date of Birth", value: artist.dob || "" },
        { label: "📍 Place", value: [artist.place, artist.country].filter(Boolean).join(", ") },
        {
            label: "🎶 Genres",
            value: Array.isArray(artist.genres) && artist.genres.length > 0
                ? artist.genres.join(", ")
                : "None"
        }
    ];

    fields.forEach(({ label, value }) =>
        detailsDiv.appendChild(createElement("p", {}, [
            createElement("strong", {}, [`${label}:`]),
            ` ${value}`
        ]))
    );

    return detailsDiv;
}

function renderSocialLinks(socials: Record<string, string>): HTMLElement {
    const links = Object.entries(socials).map(([platform, url]) =>
        createElement("a", {
            href: url,
            target: "_blank",
            class: "social-link",
            rel: "noopener noreferrer"
        }, [createIconButton({ svgMarkup: getSocialIcon(platform), classSuffix: "", label: platform })])
    );

    return createElement("div", { class: "socials" }, [
        createElement("p", {}, [createElement("strong", {}, ["🔗 Socials:"])]),
        ...links
    ]) as HTMLElement;
}

function renderCreatorActions(artist: ArtistProfile, container: HTMLElement, isLoggedIn: boolean): HTMLElement {
    const actions: HTMLElement[] = [];

    actions.push(Button("✏️ Edit Artist", "", {
        click: async () => {
            const existingArtist = (await getArtist(artist.artistid)) as ExistingArtist;
            const editContainer = document.getElementById("editartist") || container;
            createOrEditArtist({
                isLoggedIn,
                content: editContainer,
                mode: "edit",
                artistID: artist.artistid,
                existingArtist,
                isCreator: true
            });
        }
    }, "edit-artist-btn buttonx") as HTMLElement);

    actions.push(Button("🗑️ Request Deletion", "", {
        click: () => deleteArtistForm(isLoggedIn, artist.artistid, true)
    }, "del-artist-btn buttonx") as HTMLElement);

    if (!document.getElementById("editartist")) {
        actions.push(createElement("div", { class: "editform", id: "editartist" }) as HTMLElement);
    }

    return createElement("div", { class: "creator-actions" }, actions) as HTMLElement;
}