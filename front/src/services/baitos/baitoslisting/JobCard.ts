// buildCard.ts

import { createElement } from "../../../components/createElement";
import Button from "../../../components/base/Button";
import { navigate } from "../../../routes/navigate";
import { formatRelativeTime } from "../../../utils/dateUtils";
import { saveJob } from "./utils";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths";
import Imagex from "../../../components/base/Imagex";

// ---------------------------------
// INTERFACES & TYPES
// ---------------------------------

export interface BaitoJob {
    baitoid: string | number;
    banner?: string;
    wage?: number | string;
    tags?: string[];
    type?: string;
    shift?: string;
    title?: string;
    company?: string;
    category?: string;
    subcategory?: string;
    location?: string;
    createdAt?: string | number | Date;
    [key: string]: any;
}

export function buildCard(job: BaitoJob): HTMLElement {
    const bannerFilename = job.banner || "placeholder.jpg";
    const imgSrc = resolveImagePath(EntityType.BAITO, PictureType.THUMB, bannerFilename);

    const wageText = job.wage ? `💴 ¥${Number(job.wage).toLocaleString()}/hr` : "💴 Not specified";
    const tags = Array.isArray(job.tags) ? job.tags : [];
    const typeInfo = job.type ? `🕒 ${job.type}` : "";
    const shift = job.shift ? `• ${job.shift}` : "";

    // Updated Button component call for saveBtn
    const saveBtn = Button({
        title: "Save",
        id: `save-${job.baitoid}`,
        classes: "buttonx btn-bookmark",
        events: {
            click: () => saveJob(job.baitoid)
        }
    }) as HTMLButtonElement;

    const badgeTags = tags.length
        ? createElement("div", { class: "baito-tags" }, tags.map(tag =>
            createElement("span", { class: "baito-tag" }, [`#${tag}`])
        ))
        : null;

    const img = Imagex({
        src: imgSrc,
        alt: job.title || "baito banner",
        loading: "lazy",
        classes: "baito-banner-thumb"
    });

    const imageWrapper = createElement("div", {
        "events": {
            click: () => {
                navigate(`/baito/${job.baitoid}`);
            }
        }, class: "baito-card-img"
    }, [img]);

    const contentChildren: (HTMLElement | string | null)[] = [
        createElement("h3", { class: "baito-title" }, [job.title || "Untitled"]),
        createElement("p", { class: "baito-company" }, [job.company ? `🏢 ${job.company}` : "🏢 Unknown"]),
        createElement("p", { class: "baito-meta" }, [
            `${wageText}`
        ]),
        createElement("p", { class: "baito-meta" }, [
            `📁 ${job.category || "?"} › ${job.subcategory || "?"}`
        ]),
        createElement("p", { class: "baito-type-shift" }, [typeInfo, " ", shift]),
        createElement("p", { class: "baito-loc-time" }, [
            `📍 ${job.location || "Unknown"} • ${formatRelativeTime(job.createdAt ?? Date.now())}`
        ]),
        ...(badgeTags ? [badgeTags] : []),
        createElement("div", { class: "baito-actions" }, [
            // Updated Button component call for View Details
            Button({
                title: "View Details",
                id: `view-${job.baitoid}`,
                classes: "buttonx btn-secondary",
                events: {
                    click: () => navigate(`/baito/${job.baitoid}`)
                }
            }),
            saveBtn
        ])
    ];

    const contentWrapper = createElement("div", { class: "baito-card-content" }, contentChildren.filter(Boolean) as (HTMLElement | string)[]);

    return createElement("div", { class: "baito-card" }, [
        imageWrapper,
        contentWrapper
    ]) as HTMLElement;
}