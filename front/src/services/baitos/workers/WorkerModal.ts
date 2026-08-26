// openHireWorkerModal.ts

import Modal from "../../../components/ui/Modal";
import { createElement } from "../../../components/createElement";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths";
import Imagex from "../../../components/base/Imagex";

// ---------------------------------
// INTERFACES & TYPES
// ---------------------------------

export interface Worker {
    id?: string | number;
    name: string;
    avatar?: string;
    phone?: string;
    preferredRoles?: string[];
    location?: string;
    bio?: string;
    [key: string]: any;
}

export function openHireWorkerModal(worker: Worker): void {
    const wrapper = createElement("div", { class: "hire-worker-modal" }) as HTMLElement;

    const imgSrc = resolveImagePath(
        EntityType.WORKER, 
        PictureType.THUMB, 
        worker.avatar || ""
    );
    
    const image = Imagex({
        src: imgSrc,
        alt: `${worker.name} profile picture`,
        classes: "worker-image"
    });

    const details = createElement("div", { class: "worker-details" }, [
        createElement("h3", { class: "worker-name" }, [worker.name]),
        createElement("p", { class: "worker-phone" }, [`📞 ${worker.phone || "N/A"}`]),
        createElement("p", { class: "worker-role" }, [`🎯 ${(worker.preferredRoles || []).join(", ") || "Unspecified"}`]),
        createElement("p", { class: "worker-location" }, [`📍 ${worker.location || "Unknown"}`]),
        createElement("p", { class: "worker-bio" }, [`📝 ${worker.bio || "No bio provided."}`])
    ]);

    wrapper.append(image, details);

    const { close } = Modal({
        title: "Worker Details",
        content: wrapper,
        onClose: () => close(),
        size: "medium",
        closeOnOverlayClick: true
    });
}