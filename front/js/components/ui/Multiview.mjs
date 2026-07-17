import "../../../css/ui/MultiView.css";
import { SRC_URL } from "../../api/api.js";

const MultiView = (images) => {
    if (!images || images.length < 2) return null;

    // Overlay root layout structure
    const multiview = document.createElement('div');
    multiview.className = 'multiview-overlay';
    multiview.style.opacity = '0';
    multiview.style.transition = 'opacity 0.3s ease';

    // Auto-detect system context theme profiles
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
        multiview.classList.add('dark-mode');
    }

    const content = document.createElement('div');
    content.className = 'multiview-content';

    const multiContainer = document.createElement('div');
    multiContainer.className = 'multiview-container';
    multiContainer.style.position = 'relative';
    multiContainer.style.overflow = 'hidden';

    // Base layout node layer
    const bottomImg = document.createElement('img');
    bottomImg.src = `${SRC_URL}/${images[0]}`;
    bottomImg.alt = 'Original Base Image';
    bottomImg.style.display = 'block';
    bottomImg.style.width = '100%';
    bottomImg.style.height = 'auto';

    // Comparison node layer
    const topImg = document.createElement('img');
    topImg.src = `${SRC_URL}/${images[1]}`;
    topImg.alt = 'Comparison Highlight Image';
    topImg.style.position = 'absolute';
    topImg.style.top = '0';
    topImg.style.left = '0';
    topImg.style.width = '100%';
    topImg.style.height = '100%';
    topImg.style.objectFit = 'cover';
    topImg.style.pointerEvents = 'none';
    topImg.style.clipPath = 'inset(0 50% 0 0)';

    // Interactive adjustment control node
    const slider = document.createElement('div');
    slider.className = 'multiview-slider';
    slider.style.position = 'absolute';
    slider.style.top = '0';
    slider.style.left = '50%';
    slider.style.width = '4px';
    slider.style.height = '100%';
    slider.style.background = '#ffffff';
    slider.style.cursor = 'ew-resize';
    slider.style.transform = 'translateX(-50%)';

    // Secure interaction metrics for screen readers
    slider.setAttribute('role', 'slider');
    slider.setAttribute('tabindex', '0');
    slider.setAttribute('aria-label', 'Image comparison split handle');
    slider.setAttribute('aria-valuenow', '50');
    slider.setAttribute('aria-valuemin', '0');
    slider.setAttribute('aria-valuemax', '100');

    multiContainer.appendChild(bottomImg);
    multiContainer.appendChild(topImg);
    multiContainer.appendChild(slider);
    content.appendChild(multiContainer);

    let isSliderDragging = false;
    let currentPercentage = 50;

    // Core layout updates
    const updateSplitPosition = (percentage) => {
        currentPercentage = Math.max(0, Math.min(100, percentage));
        slider.style.left = `${currentPercentage}%`;
        topImg.style.clipPath = `inset(0 ${100 - currentPercentage}% 0 0)`;
        slider.setAttribute('aria-valuenow', Math.round(currentPercentage).toString());
    };

    // Calculation calculation tracking loop 
    const handleMove = (clientX) => {
        const containerRect = multiContainer.getBoundingClientRect();
        if (containerRect.width === 0) return;
        const percentage = ((clientX - containerRect.left) / containerRect.width) * 100;
        updateSplitPosition(percentage);
    };

    // Event definitions
    const onMouseMove = (e) => { if (isSliderDragging) handleMove(e.clientX); };
    const onMouseUp = () => { isSliderDragging = false; };
    const onMouseDown = () => { isSliderDragging = true; };

    const onTouchMove = (e) => {
        if (!isSliderDragging) return;
        if (e.touches.length > 0) handleMove(e.touches[0].clientX);
    };

    // Keyboard controls for accessible interactions
    const onKeyDown = (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            updateSplitPosition(currentPercentage - 5);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            updateSplitPosition(currentPercentage + 5);
        }
    };

    // Bind Event Hooks safely
    slider.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    slider.addEventListener('touchstart', onMouseDown, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onMouseUp);
    slider.addEventListener('keydown', onKeyDown);

    // Close button node setup
    const closeButton = document.createElement('button');
    closeButton.className = 'multiview-close-btn';
    closeButton.textContent = '✖';
    closeButton.setAttribute('aria-label', 'Close comparison view');

    const destroy = () => {
        multiview.style.opacity = '0';
        setTimeout(() => {
            // Explicitly clean up context to zero out residual leaks
            slider.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            slider.removeEventListener('touchstart', onMouseDown);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onMouseUp);
            slider.removeEventListener('keydown', onKeyDown);
            
            if (multiview.parentNode) {
                multiview.parentNode.removeChild(multiview);
            }
        }, 300);
    };

    closeButton.addEventListener('click', destroy);
    content.appendChild(closeButton);
    multiview.appendChild(content);

    const appRoot = document.getElementById('app');
    if (appRoot) {
        appRoot.appendChild(multiview);
    }

    // Smooth entry transition execution
    requestAnimationFrame(() => {
        multiview.style.opacity = '1';
    });

    return {
        element: multiview,
        destroy: destroy
    };
};

export default MultiView;