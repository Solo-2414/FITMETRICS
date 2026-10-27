import AOS from "aos";
import "aos/dist/aos.css";
import "../styles/motion.css";

const reduced = () =>
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * One place to configure scroll-reveal animations.
 * - once: each block animates a single time (no replay while scrolling up and down)
 * - after the reveal finishes, data-aos is removed so the card's normal hover/transition CSS works again
 *   (AOS otherwise keeps a long transition and a transform that fight hover effects)
 */
export function initMotion() {
    const DURATION = 600;
    AOS.init({
        duration: DURATION,
        easing: "ease-out-cubic",
        once: true,
        mirror: false,
        offset: 40,
        disable: reduced, // evaluated by AOS; true = elements are shown immediately
    });

    document.addEventListener("aos:in", ({ detail: node }) => {
        const delay = Number(node.getAttribute("data-aos-delay")) || 0;
        setTimeout(() => {
            node.removeAttribute("data-aos");
            node.removeAttribute("data-aos-delay");
            node.removeAttribute("data-aos-duration");
            node.classList.remove("aos-init", "aos-animate");
        }, DURATION + delay + 80);
    });
}

/** Call after a route change so elements of the new page are registered. */
export function refreshMotion() {
    requestAnimationFrame(() => AOS.refreshHard());
}
