// baitoDisplay.js

import { createElement } from "../../../components/createElement.js";
import { SRC_URL, apiFetch } from "../../../api/api.js";
import { getState } from "../../../state/state.js";
import { navigate } from "../../../routes/index.js";
import { createOrEditBaito } from "../create/createOrEditBaito.js";
import Button from "../../../components/base/Button.js";
import { showApplicantsModal } from "../dash/BaitoDash.js";
import { displayReviews } from "../../reviews/displayReviews.js";
import Notify from "../../../components/ui/Notify.mjs";
import { meChat } from "../../mechat/plugnplay.js";
import { displayGenericMap } from "../../remap/displayGenericMap.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import Imagex from "../../../components/base/Imagex.js";
import Bannerx from "../../../components/base/Bannerx.js";
import Datex from "../../../components/base/Datex.js";

/** Open chat with employer */
function startChatWithEmployer(userId, baitoId) {
  meChat(userId, "baito", baitoId);
}

/** Notify stubs */
function uploadResumeFeature() {
  Notify("Resume upload feature is under development.", { type: "info", duration: 3000, dismissible: true });
}

/** Expandable description */
function renderExpandableDescription(text = "") {
  const descP = createElement("p", { class: "baito-description" });
  const isLong = text.length > 300;
  descP.textContent = isLong ? `${text.slice(0, 300)}…` : text;

  if (!isLong) {
    return descP;
  }

  const container = createElement("div", { class: "baito-description-container" }, [descP]);
  const btn = Button("Show More", "toggle-desc", {
    click: () => {
      descP.textContent = text;
      btn.remove();
    }
  }, "btn btn-secondary btn-sm mt-1");

  container.appendChild(btn);
  return container;
}

/** Edit job wrapper */
function editBaito(baito, isLoggedIn, container) {
  createOrEditBaito({ isLoggedIn, contentContainer: container, baito, mode: "edit" });
}

/** Owner controls */
function renderOwnerControls(baito, container, isLoggedIn) {
  return createElement("div", { class: "baito-owner-controls button-group" }, [
    Button("✏️ Edit Job", "baito-edit-btn", { click: () => editBaito(baito, isLoggedIn, container) }, "buttonx btn-secondary"),
    Button(`📨 View Applicants (${baito.applicationcount || 0})`, "view-applicants-btn", { click: () => showApplicantsModal(baito) }, "buttonx btn-secondary"),
    Button("🗑 Delete Job", "delete-baito-btn", {
      click: async () => {
        if (!confirm("Delete this job permanently?")) {
          return;
        }
        try {
          await apiFetch(`/baitos/baito/${baito.baitoid}`, "DELETE");
          Notify("✅ Deleted", { type: "success", duration: 3000, dismissible: true });
          navigate("/baitos");
        } catch {
          Notify("❌ Failed to delete.", { type: "error", duration: 3000, dismissible: true });
        }
      }
    }, "buttonx btn-danger"),
    Button("Chats", "chats-btn-baito", { click: () => navigate("/merechats") }, "buttonx btn-secondary"),
    Button("Close job", "close-btn-baito", {
      click: () => {
        Notify("Closing jobs is not available yet. Please edit the listing instead.", { type: "info", duration: 3000, dismissible: true });
      }
    }, "buttonx btn-secondary"),
  ]);
}

function hasValidDeadline(value) {
  if (!value) return false;
  const date = value instanceof Date ? value : new Date(value);
  return !Number.isNaN(date.getTime()) && date.getUTCFullYear() > 1;
}

function isBaitoExpired(baito) {
  if (!hasValidDeadline(baito?.lastdate)) return false;
  const deadline = baito.lastdate instanceof Date ? baito.lastdate : new Date(baito.lastdate);
  return deadline < new Date();
}

/** Applicant controls */
function renderApplicantControls(baito, baitoid, isOwner, container, isLoggedIn) {
  const expired = isBaitoExpired(baito);
  return createElement("div", { class: "baito-user-controls button-group" }, [
    Button(
      expired ? "⏳ Job Expired" : "📩 Apply / Contact", 
      "apply-btn", 
      {
        click: async (e) => {
          if (expired) {
            return Notify("This job is no longer accepting applications.", { type: "warning", duration: 3000, dismissible: true });
          }
          if (!isLoggedIn) {
            return Notify("Please log in to apply for this job.", { type: "warning", duration: 3000, dismissible: true });
          }
          const pitch = prompt("Write a short message to the employer:");
          if (pitch === null) return; // User clicked "Cancel"
          if (!pitch.trim()) {
            return Notify("Please write a small pitch message.", { type: "warning", duration: 3000, dismissible: true });
          }

          const btn = e.currentTarget;
          btn.disabled = true;
          btn.textContent = "Applying...";

          try {
            const form = new FormData();
            form.append("pitch", pitch.trim());
            const res = await apiFetch(`/baitos/baito/${baitoid}/apply`, "POST", form);
            Notify(res.success ? "✅ Application sent!" : res.message, { type: "success", duration: 3000, dismissible: true });
            btn.textContent = "Applied";
          } catch {
            Notify("❌ Failed to apply.", { type: "error", duration: 3000, dismissible: true });
            btn.disabled = false;
            btn.textContent = "📩 Apply / Contact";
          }
        }
      }, 
      `buttonx btn-primary${expired ? " disabled" : ""}`
    ),

    Button("⭐ Save Job", "save-job-btn", {
      click: () => {
        const saved = JSON.parse(localStorage.getItem("savedJobs") || "[]");
        if (!saved.includes(baito.baitoid)) {
          saved.push(baito.baitoid);
          localStorage.setItem("savedJobs", JSON.stringify(saved));
          Notify("Saved to bookmarks!", { type: "success", duration: 3000, dismissible: true });
        } else {
          Notify("This job is already bookmarked.", { type: "info", duration: 3000, dismissible: true });
        }
      }
    }, "buttonx btn-bookmark"),

    Button("🚩 Report Listing", "report-btn", {
      click: async () => {
        const reason = prompt("Why are you reporting this job?");
        if (!reason?.trim()) return;
        try {
          await apiFetch(`/baitos/baito/${baitoid}/report`, "POST", { reason: reason.trim() });
          Notify("✅ Report submitted", { type: "success", duration: 3000, dismissible: true });
        } catch {
          Notify("❌ Failed to report", { type: "error", duration: 3000, dismissible: true });
        }
      }
    }, "buttonx btn-danger"),

    Button("💬 Chat with Employer", "chat-btn", { click: () => startChatWithEmployer(baito.ownerId, baitoid) }, "buttonx btn-secondary"),
    Button("📎 Upload Resume", "upload-resume-btn", { click: uploadResumeFeature }, "buttonx btn-secondary"),
    Button("💬 Reviews", "leave-review-btn", { click: () => displayReviews(container, isOwner, isLoggedIn, "baito", baitoid) }, "buttonx btn-secondary")
  ]);
}

/** Fetch related jobs */
async function fetchSimilarJobs(category, excludeId) {
  try {
    const jobs = await apiFetch(`/baitos/related?category=${encodeURIComponent(category)}&exclude=${excludeId}`) || [];
    return jobs.filter(j => j.baitoid !== excludeId);
  } catch {
    console.warn("Failed to load similar jobs");
    return [];
  }
}

/** Employer info */
function createEmployerSection(employer, baito) {
  if (!employer) {
    return createElement("div", { class: "baito-employer" }, [
      createElement("span", {}, [`Employer ID: ${baito.ownerId}`])
    ]);
  }
  const avatar = employer.avatar ? Imagex({ src: employer.avatar, alt: "Employer Avatar", classes: "employer-avatar" }) : null;
  const name = createElement("span", { class: "employer-name" }, [employer.name || "Anonymous Employer"]);
  const verifiedBadge = employer.verified ? createElement("span", { class: "verified-badge" }, ["✅ Verified"]) : null;
  
  return createElement("div", { class: "baito-employer" }, [avatar, name, verifiedBadge].filter(Boolean));
}

/** Job meta info */
function createMetaSection(baito) {
  const wageText = isNaN(Number(baito.wage)) ? baito.wage : `¥${Number(baito.wage).toLocaleString()}/hour`;
  const hasDeadline = hasValidDeadline(baito.lastdate);

  const metaLines = [
    baito.category && baito.subcategory ? `📂 ${baito.category} › ${baito.subcategory}` : baito.category ? `📂 ${baito.category}` : null,
    baito.wage ? `💴 Wage: ${wageText}` : null,
    baito.workHours ? `⏰ Hours: ${baito.workHours}` : null,
    baito.duration ? `🗓️ Duration: ${baito.duration}` : null,
    baito.location ? `📍 Location: ${baito.location}` : null,
    baito.phone ? `📞 Contact: ${baito.phone}` : null,
    hasDeadline ? `⏳ Apply by: ${Datex(baito.lastdate, true)}` : null,
    baito.createdAt ? `📅 Posted: ${Datex(baito.createdAt, true)}` : null,
    typeof baito.applicationcount === "number" ? `👥 Applications: ${baito.applicationcount}` : null,
  ].filter(Boolean);

  return createElement("div", { class: "baito-meta" }, metaLines.map(line => createElement("p", { class: "meta-item" }, [line])));
}

/** Tags section */
function createTagsSection(tags) {
  if (!Array.isArray(tags) || !tags.length) return null;
  return createElement("div", { class: "baito-tags" }, 
    tags.map(tag => createElement("span", { class: "baito-tag" }, [`#${tag.trim()}`]))
  );
}

/** Requirements section */
function createRequirementsSection(requirements) {
  if (!requirements || (Array.isArray(requirements) && !requirements.length)) return null;
  const reqs = Array.isArray(requirements) ? requirements : [requirements];
  return createElement("div", { class: "baito-reqs" }, [
    createElement("strong", { class: "reqs-title" }, ["📌 Requirements"]),
    createElement("ul", { class: "reqs-list" }, reqs.map(r => createElement("li", {}, [r]))),
  ]);
}

/** Banner section */
function createBaitoBannerSection(baito, isCreator) {
  return Bannerx({
    isCreator: isCreator,
    bannerkey: baito.banner,
    banneraltkey: `Banner for ${baito.title || "Baito"}`,
    bannerentitytype: EntityType.BAITO,
    stateentitykey: "baito",
    bannerentityid: baito.baitoid
  });
}

/** Similar jobs section with improved cards */
async function getSimilarJobsElement(category, excludeId) {
  const similarJobs = await fetchSimilarJobs(category, excludeId);
  if (!similarJobs.length) return null;

  const details = createElement("details", { class: "baito-related-details" }, [
    createElement("summary", {}, ["🔎 Similar Jobs"]),
  ]);

  similarJobs.slice(0, 4).forEach(job => {
    const wageText = isNaN(Number(job.wage)) ? job.wage : `¥${Number(job.wage).toLocaleString()}/hour`;
    const bannerSrc = job.banner
      ? resolveImagePath(EntityType.BAITO, PictureType.BANNER, job.banner)
      : `${SRC_URL}/images/placeholder-banner.png`;

    const card = createElement("div", { class: "baito-related-card card" }, [
      Imagex({ src: bannerSrc, alt: job.title || "Job Banner", classes: "related-card-banner" }),
      createElement("div", { class: "related-card-content" }, [
        createElement("h4", { class: "related-card-title" }, [job.title || "Untitled"]),
        job.location ? createElement("p", { class: "related-card-location" }, [`📍 ${job.location}`]) : null,
        job.wage ? createElement("p", { class: "related-card-wage" }, [`💴 ${wageText}`]) : null,
        Button("View", "", { click: () => navigate(`/baito/${job.baitoid}`) }, "btn btn-sm btn-primary related-card-btn"),
      ].filter(Boolean)),
    ]);

    details.appendChild(card);
  });

  return details;
}

/** Main display function */
export async function displayBaito(isLoggedIn, baitoid, contentContainer) {
  contentContainer.replaceChildren();
  
  try {
    const baito = await apiFetch(`/baitos/baito/${baitoid}`);
    if (!baito) {
      throw new Error("Baito not found");
    }

    // Safety: Check if nested user object contains matching ID
    const loggedInUser = getState("user");
    const isOwner = loggedInUser && (loggedInUser.id === baito.ownerId || loggedInUser === baito.ownerId);

    const section = createElement("div", { class: "baito-detail-wrapper" });
    section.appendChild(createElement("h2", { class: "baito-title" }, [baito.title || "Untitled Job"]));
    section.appendChild(createBaitoBannerSection(baito, isOwner));

    const employerSection = createEmployerSection(baito.employer, baito);
    if (employerSection) section.appendChild(employerSection);

    section.appendChild(createMetaSection(baito));

    const tagsSection = createTagsSection(baito.tags);
    if (tagsSection) section.appendChild(tagsSection);

    const reqSection = createRequirementsSection(baito.requirements);
    if (reqSection) section.appendChild(reqSection);

    if (baito.description) {
      section.appendChild(renderExpandableDescription(baito.description));
    }

    // Review and action panels
    const reviewSec = createElement("div", { class: "baito-review-section" });
    const controls = isOwner
      ? renderOwnerControls(baito, contentContainer, isLoggedIn)
      : renderApplicantControls(baito, baitoid, isOwner, reviewSec, isLoggedIn);

    section.appendChild(controls);
    section.appendChild(reviewSec);

    // Dynamic Map integration
    if (baito.coords?.lat && baito.coords?.lng) {
      const mapContainer = createElement("div", {
        class: "baito-map-container",
        style: "height: 300px; margin: 20px 0; border-radius: 8px; overflow: hidden;"
      });
      section.appendChild(mapContainer);

      displayGenericMap(mapContainer, {
        mapImage: `${SRC_URL}/images/world-map.png`,
        mapWidth: 1200,
        mapHeight: 800,
        mapBounds: { minLat: -90, maxLat: 90, minLon: -180, maxLon: 180 },
        currentLocation: {
          lat: baito.coords.lat,
          lon: baito.coords.lng
        },
        markers: [{
          id: "baito-location",
          lat: baito.coords.lat,
          lon: baito.coords.lng,
          name: baito.location || baito.title,
          type: "shop",
          description: `Job: ${baito.title}`
        }],
        projection: "mercator",
        minZoom: 0.5,
        maxZoom: 5,
        showLegend: false,
        theme: "light",
        onMarkerClick: () => {
          Notify(`📍 ${baito.location || baito.title}`, { type: "info", duration: 3000 });
        }
      });
    }

    // Fetch and append related jobs element cleanly to avoid async DOM layout flashes
    if (baito.category) {
      const similarJobsEl = await getSimilarJobsElement(baito.category, baitoid);
      if (similarJobsEl) {
        section.appendChild(similarJobsEl);
      }
    }

    contentContainer.appendChild(section);
  } catch (error) {
    contentContainer.appendChild(createElement("p", { class: "error-message" }, ["🚫 Unable to load job details. Please try again later."]));
    console.error("Failed to fetch baito:", error);
  }
}