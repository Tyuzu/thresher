import { RenderImagePost } from "./renders/renderImagePost.js";
import { RenderVideoPost } from "./renders/renderVideoPost.js";
import { RenderAudioPost } from "./renders/renderAudioPost.js";
import { createElement } from "../../components/createElement.js";

async function createChatContent(
  post,
  media = [],
  isOwn = false
) {
  const type =
    post?.type ?? "file";

  const bubble = createElement(
    "section",
    {
      class: `chat-bubble ${
        isOwn
          ? "chat-own"
          : "chat-other"
      }`,
      role: "group",
      "aria-label": `${type} message`
    }
  );

  if (post?.content) {
    bubble.appendChild(
      createElement(
        "p",
        {
          class:
            "chat-message-text"
        },
        [post.content]
      )
    );
  }

  if (
    !Array.isArray(media) ||
    media.length === 0
  ) {
    return bubble;
  }

  const mediaContainer =
    createElement("div", {
      class: "chat-media",
      "aria-label":
        `${type} attachment`
    });

  switch (type) {
    case "image":
      await RenderImagePost(
        mediaContainer,
        media.map(
          (url, index) => ({
            src: url,
            alt: `Image ${
              index + 1
            }`
          })
        )
      );
      break;

    case "video":
      await RenderVideoPost(
        mediaContainer,
        media,
        {
          controls: true,
          "aria-label":
            "Video message"
        }
      );
      break;

    case "audio":
      await RenderAudioPost(
        mediaContainer,
        media[0],
        {
          controls: true,
          "aria-label":
            "Audio message"
        }
      );
      break;

    default:
      media.forEach(
        (url, index) => {
          mediaContainer.appendChild(
            createElement(
              "a",
              {
                href: url,
                target: "_blank",
                rel:
                  "noopener noreferrer",
                class:
                  "chat-file-link",
                "aria-label":
                  `Download file ${
                    index + 1
                  }`
              },
              [
                `Download file ${
                  index + 1
                }`
              ]
            )
          );
        }
      );
  }

  bubble.appendChild(
    mediaContainer
  );

  return bubble;
}

export { createChatContent };