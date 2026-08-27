import "../../../css/ui/Carousel.css";
import Imagex from "../base/Imagex.js";
import { playSVG } from "../svgs/featherSVGs";

export interface CarouselItem {
  src: string;
  alt?: string;
}

// Helper: convert SVG string -> DOM element
function createSVG(svgString: string): Node {
  const template = document.createElement("template");
  template.innerHTML = svgString.trim();
  return template.content.firstChild || document.createTextNode("");
}

const Carousel = (imagesArray: CarouselItem[] = []): HTMLDivElement => {
  let currentIndex = 0;
  let startX = 0;
  let endX = 0;

  const carouselContainer = document.createElement("div");
  carouselContainer.setAttribute("class", "carousel");

  const firstItem = imagesArray[0];
  if (!imagesArray || imagesArray.length === 0 || !firstItem) {
    return carouselContainer;
  }

  const imageWrapper = document.createElement("div");
  imageWrapper.setAttribute("class", "carousel-image-wrapper");

  const img = Imagex({
    src: firstItem.src,
    alt: firstItem.alt || "Carousel Image",
    class: "carousel-image",
  }) as HTMLImageElement;

  imageWrapper.appendChild(img);
  carouselContainer.appendChild(imageWrapper);

  function updateImage(index: number): void {
    currentIndex = (index + imagesArray.length) % imagesArray.length;
    const currentItem = imagesArray[currentIndex];
    if (currentItem) {
      img.setAttribute("src", currentItem.src);
      img.setAttribute("alt", currentItem.alt || "Carousel Image");
    }
  }

  if (imagesArray.length > 1) {
    const prevBtn = document.createElement("button");
    prevBtn.setAttribute("class", "carousel-btn prev");
    const prevIcon = createSVG(playSVG);
    prevBtn.appendChild(prevIcon);

    const nextBtn = document.createElement("button");
    nextBtn.setAttribute("class", "carousel-btn next");
    const nextIcon = createSVG(playSVG);
    nextBtn.appendChild(nextIcon);

    prevBtn.addEventListener("click", () => updateImage(currentIndex - 1));
    nextBtn.addEventListener("click", () => updateImage(currentIndex + 1));

    carouselContainer.appendChild(prevBtn);
    carouselContainer.appendChild(nextBtn);

    // Touch swipe support
    imageWrapper.addEventListener("touchstart", (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        startX = touch.clientX;
      }
    });

    imageWrapper.addEventListener("touchend", (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      if (touch) {
        endX = touch.clientX;
        const diff = endX - startX;
        if (Math.abs(diff) > 50) {
          if (diff > 0) {
            updateImage(currentIndex - 1); // Swipe right -> prev
          } else {
            updateImage(currentIndex + 1); // Swipe left -> next
          }
        }
      }
    });
  }

  return carouselContainer;
};

export default Carousel;