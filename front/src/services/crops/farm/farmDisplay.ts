import "../../../../css/ui/createTabs.css";
import { createElement } from "../../../components/createElement.js";
import { fetchFarmDetails } from "../api.js";
import Button, { ButtonOptions } from "../../../components/base/Button.js";
import { editFarm } from "./editFarm.js";
import { getState } from "../../../state/state.js";
import { resolveImagePath, EntityType, PictureType } from "../../../utils/imagePaths.js";
import { updateImageWithCrop } from "../../../utils/bannerEditor.js";
import {
  renderFarmDetails,
  renderCropSummary,
  renderCropEmojiMap,
  renderCrops,
  createSortDropdown,
  Farm as HelperFarm
} from "./displayFarmHelpers.js";
import { displayReviews } from "../../reviews/displayReviews.js";
import { farmChat } from "./farmchat.js";
import Imagex from "../../../components/base/Imagex.js";
import { persistTabs, TabItem } from "../../../utils/persistTabs.js";
import { displayNotices } from "../../notices/notices.js";
import { displayFanMedia } from "../../fanmade/mediaGallery.js";
import { renderWeatherDetails } from "../weather/weather.js";
import { createCrop } from "../crop/createCrop.js";
import Modal from "../../../components/ui/Modal.js";
import { renderAvailabilityWidget } from "../../../components/ui/Availability.js";
import { createMainLayout } from "../../../components/layout/mainLayout.js";
import { createAsideContent } from "../../../components/layout/asideLayout.js";
import { createBreadcrumb } from "../../../components/ui/Breadcrumb.js";

interface Crop {
  id?: string | number;
  name?: string;
  [key: string]: any;
}

interface Farm {
  farmid?: string | number;
  name?: string;
  photo?: string;
  createdBy?: string | number;
  crops?: Crop[];
  availability?: any;
  [key: string]: any;
}

interface FarmApiResponse {
  success: boolean;
  farm?: Farm;
}

/**
 * Main view renderer for individual farm pages.
 *
 * @param isLoggedIn - User authorization state.
 * @param farmId - Unique ID of the farm to render.
 * @param content - Container DOM node.
 */
export async function displayFarm(
  isLoggedIn: boolean,
  farmId: string | number,
  content: HTMLElement | null
): Promise<void> {
  if (!content) return;

  const container = createElement("div", { class: "farmpage" }) as HTMLElement;
  content.replaceChildren(container);

  let farmRes: FarmApiResponse | undefined;
  try {
    farmRes = await fetchFarmDetails(farmId);
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
  const currentUser = getState("user")?.userid;
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

  const bannerControls: HTMLElement[] = isCreator
    ? [
        Button({
          title: "Edit Banner",
          id: "edit-banner-btn",
          classes: "edit-banner-pic",
          events: {
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
          }
        })
      ]
    : [];

  const banner = createElement("div", { class: "farm-banner" }, [
    bannerImage,
    ...bannerControls
  ]);

  // ─────────── Aside Panel ───────────
  const cropsList: Crop[] = Array.isArray(farm.crops) ? farm.crops : [];
  const summaryStats = renderCropSummary(cropsList);
  const cropDistribution = renderCropEmojiMap(cropsList);

  const reviewPlaceholder = createElement("div", { class: "review-block" }, [
    createElement("p", {}, ["⭐ Reviews"]),
    Button({
      title: "💬 Check reviews",
      id: "review-btn",
      classes: "buttonx",
      events: {
        click: () =>
          displayReviews(
            reviewPlaceholder,
            isCreator,
            isLoggedIn,
            "farm",
            normalizedFarmId
          )
      }
    })
  ]) as HTMLElement;

  const userActionButtons: HTMLElement[] = isLoggedIn && !isCreator
    ? [
        Button({
          title: "Schedule a visit",
          id: "cta-visit-btn",
          classes: "buttonx",
          events: {
            click: () => console.warn("Schedule visit feature upcoming")
          }
        }),
        Button({
          title: "Pre-order",
          id: "cta-pre-btn",
          classes: "buttonx",
          events: {
            click: () => console.warn("Pre-order feature upcoming")
          }
        }),
        Button({
          title: "Chat",
          id: "cta-chat-btn",
          classes: "buttonx",
          events: {
            click: () => farmChat(String(farm.createdBy), normalizedFarmId)
          }
        })
      ]
    : [];

  const creatorActionButtons: HTMLElement[] = isCreator
    ? [
        Button({
          title: "Creator Tools",
          id: "cta-creator-btn",
          classes: "buttonx",
          events: {
            click: () => console.warn("Creator tools panel upcoming")
          }
        })
      ]
    : [];

  const weatherWidget = renderWeatherDetails();

  const asideContent = createAsideContent({
    title: "Farm Summary",
    actions: [...userActionButtons, ...creatorActionButtons],
    sections: [
      weatherWidget && { content: weatherWidget },
      summaryStats && { title: "Crop Summary", content: summaryStats },
      cropDistribution && { title: "Crop Distribution", content: cropDistribution },
      { content: renderAvailabilityWidget(farm.availability) },
      { content: reviewPlaceholder }
    ].filter(Boolean) as any,
    showAd: true,
    page: "farm-detail",
    adPosition: "aside",
    adOptions: {
      layout: "vertical"
    }
  });

  // ─────────── Main Section & Tabs ───────────
  const mainColumn = createElement("div", { class: "farm-main" }) as HTMLElement;
  const editContainer = createElement("div", { class: "edit-container" }) as HTMLElement;

  mainColumn.append(banner, editContainer);

  const tabs: TabItem[] = [
    {
      title: "Info",
      id: "info-tab",
      render: (tabContainer: HTMLElement) => {
        tabContainer.replaceChildren(
          renderFarmDetails(farm as HelperFarm, isCreator, (farmData: HelperFarm) => {
            editFarm(isLoggedIn, farmData, editContainer, () => {
              if (farm.farmid) {
                displayFarm(isLoggedIn, farm.farmid, content);
              }
            });
          })
        );
      }
    },
    {
      title: "Crops",
      id: "crops-tab",
      render: async (tabContainer: HTMLElement) => {
        tabContainer.replaceChildren();

        const cropsContainer = createElement("div", {
          class: "crop-list grid-view"
        }) as HTMLElement;

        const cropHeader = createElement("div", { class: "crop-header" }, [
          createElement("h3", {}, ["🌾 Available Crops"]),
          createSortDropdown((sortBy: string) =>
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
            Button({
              title: "Add Crop",
              id: "add-crop-btn",
              classes: "buttonx",
              events: {
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
              }
            })
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
      render: (tabContainer: HTMLElement) => {
        tabContainer.replaceChildren();
        displayNotices("farm", normalizedFarmId, tabContainer, isCreator);
      }
    },
    {
      title: "Gallery",
      id: "gallery-tab",
      render: (tabContainer: HTMLElement) => {
        tabContainer.replaceChildren();
        displayFanMedia(tabContainer, "farm", normalizedFarmId, isCreator);
      }
    },
    {
      title: "Reviews",
      id: "reviews-tab",
      render: (tabContainer: HTMLElement) => {
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
    pageClass: "farm-layout",
    showMainAd: true,
    mainAdPlacement: "top"
  });

  container.append(header, layoutWrapper);
}