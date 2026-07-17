import { AD_URL } from "../state/state.js";

(function () {
    // 1. Unified State Management Systems
    const adCache = {}; // Stores arrays or network promises
    const adInstances = new Map(); // Tracks dynamic metadata per active slot

    const adElements = document.querySelectorAll(".advertisement");
    if (adElements.length === 0) {
        console.warn("No advertisement containers found!");
        return;
    }

    /**
     * Safely updates DOM structure with a transition fade overlay
     */
    function renderAd(container, ads, index) {
        const ad = ads[index % ads.length];
        if (!ad) return;

        container.classList.add("fade-out");

        setTimeout(() => {
            container.innerHTML = ""; // Safe container sweep

            const adCard = document.createElement("div");
            adCard.className = "ad-card";

            const img = document.createElement("img");
            img.src = ad.image || "";
            img.alt = ad.title || "Advertisement";
            img.loading = "lazy";

            const adContent = document.createElement("div");
            adContent.className = "ad-content";

            const title = document.createElement("h3");
            title.textContent = ad.title || "";

            const desc = document.createElement("p");
            desc.textContent = ad.description || "";

            const link = document.createElement("a");
            link.href = ad.link || "#";
            link.target = "_blank";
            link.rel = "noopener noreferrer"; // Hardened window isolation
            link.textContent = "Learn More";

            const progress = document.createElement("div");
            progress.className = "ad-progress";

            adContent.appendChild(title);
            adContent.appendChild(desc);
            adContent.appendChild(link);

            adCard.appendChild(img);
            adCard.appendChild(adContent);
            adCard.appendChild(progress);

            container.appendChild(adCard);
            
            container.classList.remove("fade-out");
            container.classList.add("fade-in");

            // Restart progress bar animation sync
            progress.style.animation = "none";
            // Force reflow layout calculations to reset the CSS keyframe chain safely
            void progress.offsetWidth; 
            progress.style.animation = "progressAnim 10s linear forwards";
        }, 300);
    }

    /**
     * Deduplicates outgoing category queries
     */
    async function loadAndDisplayAds(container, category = "default") {
        try {
            // Check if active cache layer contains elements or a mid-flight promise
            if (!adCache[category]) {
                adCache[category] = fetch(`${AD_URL}?category=${category}`)
                    .then(res => {
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        return res.json();
                    })
                    .catch(err => {
                        adCache[category] = null; // Flush cache on failure to allow retries
                        throw err;
                    });
            }

            const ads = await adCache[category];

            if (!ads || !ads.length) {
                renderPlaceholder(container, "No ads available");
                return;
            }

            initAdRotationSystem(container, ads);
        } catch (error) {
            console.error(`Error loading ads for category '${category}':`, error);
            renderPlaceholder(container, "Error loading ads");
        }
    }

    function renderPlaceholder(container, message) {
        const msg = document.createElement("p");
        msg.className = "ad-placeholder-msg";
        msg.textContent = message;
        container.innerHTML = "";
        container.appendChild(msg);
    }

    /**
     * Initializes rotation tracking context and attaches permanent event listeners ONCE
     */
    function initAdRotationSystem(container, ads) {
        // Initialize instance context properties
        const instance = {
            ads,
            currentIndex: 0,
            intervalId: null,
            isPaused: false
        };

        adInstances.set(container, instance);

        // Core loop execution worker
        const cycleRotation = () => {
            if (instance.isPaused) return;
            instance.currentIndex = (instance.currentIndex + 1) % instance.ads.length;
            renderAd(container, instance.ads, instance.currentIndex);
        };

        // Render the very first advertisement card
        renderAd(container, instance.ads, instance.currentIndex);
        instance.intervalId = setInterval(cycleRotation, 10000);

        // ATTACH PERMANENT LISTENERS (Executed exactly once per block initialization)
        container.addEventListener("mouseenter", () => {
            instance.isPaused = true;
            if (instance.intervalId) {
                clearInterval(instance.intervalId);
                instance.intervalId = null;
            }
            // Optional: pause the progress bar animation via standard CSS layout state
            const progress = container.querySelector(".ad-progress");
            if (progress) progress.style.animationPlayState = "paused";
        });

        container.addEventListener("mouseleave", () => {
            instance.isPaused = false;
            
            const progress = container.querySelector(".ad-progress");
            if (progress) progress.style.animationPlayState = "running";

            // Restart structural rotation framework loop safely without stacking bindings
            if (!instance.intervalId) {
                instance.intervalId = setInterval(cycleRotation, 10000);
            }
        });
    }

    // Lazy load runtime configurations
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const container = entry.target;
                obs.unobserve(container);
                
                const category = container.getAttribute("data-category") || "default";
                loadAndDisplayAds(container, category);
            }
        });
    }, {
        rootMargin: "100px",
        threshold: 0.1,
    });

    adElements.forEach((el) => observer.observe(el));
})();