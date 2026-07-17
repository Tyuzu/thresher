import Imagex from "../base/Imagex";
import "../../../css/ui/Carousel.css";
import { playSVG } from "../svgs";

// Helper: convert SVG string -> DOM element
function createSVG(svgString) {
    const template = document.createElement("template");
    template.innerHTML = svgString.trim();
    return template.content.firstChild;
}

const Carousel = (imagesArray) => {
    if (!imagesArray || imagesArray.length === 0) return document.createElement('div');

    let currentIndex = 0;
    let startX = 0;

    const carouselContainer = document.createElement('div');
    carouselContainer.setAttribute("class", "carousel");

    // Container window hiding structural overflows
    const imageTrackWindow = document.createElement('div');
    imageTrackWindow.setAttribute("class", "carousel-track-window");

    // The strip holding all slides side-by-side
    const imageTrack = document.createElement('div');
    imageTrack.setAttribute("class", "carousel-track");
    imageTrack.style.display = "flex";
    imageTrack.style.transition = "transform 0.3s ease-in-out";
    imageTrack.style.width = `${imagesArray.length * 100}%`;

    // Instantiate and append all slide instances up front
    imagesArray.forEach((imgData) => {
        const slide = document.createElement('div');
        slide.setAttribute("class", "carousel-slide");
        slide.style.width = `${100 / imagesArray.length}%`;

        const img = Imagex({
            src: imgData.src,
            alt: imgData.alt || 'Carousel Image',
            class: 'carousel-image',
        });

        slide.appendChild(img);
        imageTrack.appendChild(slide);
    });

    imageTrackWindow.appendChild(imageTrack);
    carouselContainer.appendChild(imageTrackWindow);

    function updateCarouselPosition() {
        // GPU accelerated layer displacement shifting between slide views
        const offset = -currentIndex * (100 / imagesArray.length);
        imageTrack.style.transform = `translateX(${offset}%)`;
    }

    if (imagesArray.length > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.setAttribute("class", "carousel-btn prev");
        prevBtn.appendChild(createSVG(playSVG));

        const nextBtn = document.createElement('button');
        nextBtn.setAttribute("class", "carousel-btn next");
        nextBtn.appendChild(createSVG(playSVG));

        prevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + imagesArray.length) % imagesArray.length;
            updateCarouselPosition();
        });

        nextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % imagesArray.length;
            updateCarouselPosition();
        });

        carouselContainer.appendChild(prevBtn);
        carouselContainer.appendChild(nextBtn);

        // Responsive Touch Interactivity mappings
        imageTrackWindow.addEventListener("touchstart", (e) => {
            startX = e.touches[0].clientX;
        }, { passive: true });

        imageTrackWindow.addEventListener("touchend", (e) => {
            const endX = e.changedTouches[0].clientX;
            const diff = endX - startX;

            if (Math.abs(diff) > 50) { 
                if (diff > 0) {
                    // Swipe right -> View previous slide
                    currentIndex = (currentIndex - 1 + imagesArray.length) % imagesArray.length;
                } else {
                    // Swipe left -> View next slide
                    currentIndex = (currentIndex + 1) % imagesArray.length;
                }
                updateCarouselPosition();
            }
        }, { passive: true });
    }

    return carouselContainer;
};

export default Carousel;