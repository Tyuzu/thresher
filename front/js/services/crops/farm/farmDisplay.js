import { apiFetch } from "../../../api/api.js";
import { createElement } from "../../../components/createElement.js";
import Button from "../../../components/base/Button.js";
import { navigate } from "../../../routes/index.js";
import { getState } from "../../../state/state.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import { updateImageWithCrop } from "../../../utils/bannerEditor.js";
import { renderFarmDetails, renderCropSummary, renderCropEmojiMap, renderCrops, createSortDropdown } from "./displayFarmHelpers.js";
import { displayReviews } from "../../reviews/displayReviews.js";
import { farmChat } from "./farmchat.js";
import Imagex from "../../../components/base/Imagex.js";
import NoLink from "../../../components/base/NoLink.js";
import { persistTabs } from "../../../utils/persistTabs.js";
import { displayNotices } from "../../notices/notices.js";
import { displayFanMedia } from "../../fanmade/ui/mediaGallery.js";
import { renderWeatherDetails } from "../weather/weather.js";
import { createCrop } from "../crop/createCrop.js";
import Modal from "../../../components/ui/Modal.mjs";
import { renderAvailabilityWidget } from "../../../components/ui/Availability.mjs";
import { createMainLayout } from "../../../components/layout/mainLayout.js";
import { createAsideContent } from "../../../components/layout/asideLayout.js";
import { createBreadcrumb } from "../../../components/ui/Breadcrumb.mjs";

/**
 * Main view renderer for individual farm pages.
 *
 * @param {boolean} isLoggedIn - User authorization state.
 * @param {string|number} farmId - Unique ID of the farm to render.
 * @param {HTMLElement} content - Container DOM node.
 */
export async function displayFarm(isLoggedIn, farmId, content) {
  if (!content) return;

  const container = createElement("div", { class: "farmpage" });
  content.replaceChildren(container);

  let farmRes;
  try {
    farmRes = await apiFetch(`/farms/farm/${farmId}`);
  } catch (error) {
    console.error("Failed to fetch farm details:", error);
  }

  const farm = farmRes?.farm;
  if (!farmRes?.success || !farm) {
    container.append(
      createElement("div", { class: "error-state" }, [
        createElement("p", {}, ["Farm not found or failed to load."])
      ])
    );
    return;
  }

  const normalizedFarmId = String(farm.farmid);
  const currentUser = getState("user");
  const isCreator = Boolean(currentUser && currentUser === farm.createdBy);

  // ─────────── Header & Breadcrumb ───────────
  const farmBreadcrumb = createBreadcrumb([
    { label: "Home", path: "/" },
    { label: "Farms", path: "/farms" },
    { label: farm.name || "Farm Details", path: `/farms/farm/${normalizedFarmId}` }
  ]);

  const header = createElement("div", { class: "farm-header" }, [farmBreadcrumb]);

  // ─────────── Banner ───────────
  const bannerImage = Imagex({
    src: resolveImagePath(EntityType.FARM, PictureType.BANNER, farm.photo),
    alt: farm.name || "Farm",
    id: "farm-banner-img"
  });

  const bannerControls = isCreator
    ? [
      Button(
        "Edit Banner",
        "edit-banner-btn",
        {
          click: () => {
            updateImageWithCrop({
              entityType: EntityType.FARM,
              imageType: "banner",
              stateKey: "banner",
              stateEntityKey: "farm",
              previewElementId: "farm-banner-img",
              pictureType: PictureType.BANNER,
              entityId: normalizedFarmId
            });
          }
        },
        "edit-banner-pic"
      )
    ]
    : [];

  const banner = createElement("div", { class: "farm-banner" }, [
    bannerImage,
    ...bannerControls
  ]);

  // ─────────── Aside Panel ───────────
  const cropsList = Array.isArray(farm.crops) ? farm.crops : [];
  const summaryStats = renderCropSummary(cropsList);
  const cropDistribution = renderCropEmojiMap(cropsList);

  const reviewPlaceholder = createElement("div", { class: "review-block" }, [
    createElement("p", {}, ["⭐ Reviews"]),
    Button(
      "💬 Check reviews",
      "review-btn",
      {
        click: () =>
          displayReviews(
            reviewPlaceholder,
            isCreator,
            isLoggedIn,
            "farm",
            normalizedFarmId
          )
      },
      "buttonx"
    )
  ]);

  const userActionButtons = isLoggedIn && !isCreator
    ? [
      Button("Schedule a visit", "cta-visit-btn", {
        click: () => console.warn("Schedule visit feature upcoming")
      }, "buttonx"),
      Button("Pre-order", "cta-pre-btn", {
        click: () => console.warn("Pre-order feature upcoming")
      }, "buttonx"),
      Button("Chat", "cta-chat-btn", {
        click: () => farmChat(farm.createdBy, normalizedFarmId)
      }, "buttonx")
    ]
    : [];

  const creatorActionButtons = isCreator
    ? [
      Button("Creator Tools", "cta-creator-btn", {
        click: () => console.warn("Creator tools panel upcoming")
      }, "buttonx")
    ]
    : [];

  const farmCTA = createElement("div", { class: "cta-block" }, [
    ...userActionButtons,
    ...creatorActionButtons
  ]);

  const weatherWidget = renderWeatherDetails(farm, isCreator);

  const asideContent = createAsideContent({
    title: "Farm Summary",
    children: [
      weatherWidget,
      farmCTA,
      summaryStats,
      cropDistribution,
      renderAvailabilityWidget(farm.availability),
      reviewPlaceholder
    ].filter(Boolean),
    showAd: true
  });

  // ─────────── Main Section & Tabs ───────────
  const mainColumn = createElement("div", { class: "farm-main" });
  const editContainer = createElement("div", { class: "edit-container" });

  mainColumn.append(banner, editContainer);

  const tabs = [
    {
      title: "Info",
      id: "info-tab",
      render: (tabContainer) => {
        tabContainer.replaceChildren(renderFarmDetails(farm, isCreator));
      }
    },
    {
      title: "Crops",
      id: "crops-tab",
      render: async (tabContainer) => {
        tabContainer.replaceChildren();

        const cropsContainer = createElement("div", {
          class: "crop-list grid-view"
        });

        const cropHeader = createElement("div", { class: "crop-header" }, [
          createElement("h3", {}, ["🌾 Available Crops"]),
          createSortDropdown((sortBy) =>
            renderCrops(
              farm,
              cropsContainer,
              normalizedFarmId,
              mainColumn,
              editContainer,
              isLoggedIn,
              sortBy,
              isCreator
            )
          )
        ]);

        if (isCreator) {
          tabContainer.append(
            Button("Add Crop", "add-crop-btn", {
              click: async () => {
                const modalRef = Modal({
                  title: "Add Crop",
                  content: createElement("p", {}, ["Loading..."]),
                  size: "medium",
                  closeOnOverlayClick: true
                });

                try {
                  const formEl = await createCrop(normalizedFarmId, () => modalRef.close());
                  const body = modalRef.dialog?.querySelector(".modal-body");
                  if (body && formEl) {
                    body.replaceChildren(formEl);
                  }
                } catch (err) {
                  console.error("Failed to render Add Crop form:", err);
                }
              }
            }, "buttonx")
          );
        }

        tabContainer.append(cropHeader, cropsContainer);

        await renderCrops(
          farm,
          cropsContainer,
          normalizedFarmId,
          mainColumn,
          editContainer,
          isLoggedIn,
          "name",
          isCreator
        );
      }
    },
    {
      title: "Notices",
      id: "notices-tab",
      render: (tabContainer) => {
        tabContainer.replaceChildren();
        displayNotices("farm", normalizedFarmId, tabContainer, isCreator);
      }
    },
    {
      title: "Gallery",
      id: "gallery-tab",
      render: (tabContainer) => {
        tabContainer.replaceChildren();
        displayFanMedia(tabContainer, "farm", normalizedFarmId, isCreator);
      }
    },
    {
      title: "Reviews",
      id: "reviews-tab",
      render: (tabContainer) => {
        tabContainer.replaceChildren();
        displayReviews(
          tabContainer,
          isCreator,
          isLoggedIn,
          "farm",
          normalizedFarmId
        );
      }
    }
  ];

  persistTabs(mainColumn, tabs, `farm-tabs:${normalizedFarmId}`);

  // ─────────── Layout Composition ───────────
  const layoutWrapper = createMainLayout({
    mainContent: [mainColumn],
    asideContent,
    pageClass: "farm-layout"
  });

  container.append(header, layoutWrapper);
}