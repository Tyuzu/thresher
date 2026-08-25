import { RenderImagePost } from "./renders/renderImagePost.js";
import { RenderVideoPost } from "./renders/renderVideoPost.js";
import { RenderAudioPost } from "./renders/renderAudioPost.js";
import { createElement } from "../../components/createElement.js";

/* ───────────────────────────────────────── */
/* Types & Interfaces                       */
/* ───────────────────────────────────────── */

export type PostType = "image" | "video" | "audio" | "file" | string;

export interface Post {
  type?: PostType;
  content?: string;
  [key: string]: unknown;
}

export interface VideoPostOptions {
  controls?: boolean;
  "aria-label"?: string;
  [key: string]: unknown;
}

export interface AudioPostOptions {
  controls?: boolean;
  "aria-label"?: string;
  [key: string]: unknown;
}

/* ───────────────────────────────────────── */
/* Function Implementation                   */
/* ───────────────────────────────────────── */

function createChatContent(
  post?: Post | null,
  media: string[] = [],
  isOwn: boolean = false
): HTMLElement {
  const type: PostType = post?.type ?? "file";

  // 1. Create the base bubble container synchronously to prevent layout blocks
  const bubble = createElement(
    "section",
    {
      class: `chat-bubble ${isOwn ? "chat-own" : "chat-other"}`,
      role: "group",
      "aria-label": `${type} message`
    }
  );

  // 2. Render text content
  if (post?.content) {
    bubble.appendChild(
      createElement(
        "p",
        {
          class: "chat-message-text message-content"
        },
        [post.content]
      )
    );
  }

  // If there's no media, we can exit early and cleanly
  if (!Array.isArray(media) || media.length === 0) {
    return bubble;
  }

  const mediaContainer = createElement("div", {
    class: "chat-media",
    "aria-label": `${type} attachment`
  });

  bubble.appendChild(mediaContainer);

  // 3. Handle media rendering asynchronously without blocking the thread
  // This allows the bubble to paint to the screen instantly while the media loads
  (async (): Promise<void> => {
    try {
      switch (type) {
        case "image":
          await RenderImagePost(
            mediaContainer,
            media.map((url, index) => ({
              src: url,
              alt: `Image ${index + 1}`
            }))
          );
          break;

        case "video":
          await RenderVideoPost(mediaContainer, media, {
            controls: true,
            "aria-label": "Video message"
          });
          break;

        case "audio":
          await RenderAudioPost(mediaContainer, media[0], {
            controls: true,
            "aria-label": "Audio message"
          });
          break;

        default: {
          const fileList = createElement("ul", { class: "chat-file-list" });

          media.forEach((url, index) => {
            const fileName = `Download file ${index + 1}`;
            const fileItem = createElement("li", { class: "chat-file-item" });

            const link = createElement(
              "a",
              {
                href: url,
                target: "_blank",
                rel: "noopener noreferrer",
                class: "chat-file-link",
                "aria-label": fileName
              },
              [fileName]
            );

            fileItem.appendChild(link);
            fileList.appendChild(fileItem);
          });

          mediaContainer.appendChild(fileList);
          break;
        }
      }
    } catch (error: unknown) {
      console.error("Failed to render attachment media:", error);

      // Graceful fallback display if renderer fails
      mediaContainer.textContent = "Failed to load media attachment.";
    }
  })();

  return bubble;
}

export { createChatContent };