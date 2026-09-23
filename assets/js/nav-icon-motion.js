import { svgToIcon } from "../vendor/morphicons/adapters.js";
import { createMorph } from "../vendor/morphicons/dom.js";

const hoverCapable = window.matchMedia("(hover: hover)");
const arrow = "M4 12h16M14 6l6 6-6 6";

document.querySelectorAll("#menu a").forEach((link) => {
    const svg = link.querySelector(".menu-icon svg");
    if (!svg) return;

    // Tabler SVGs include a non-rendered 24×24 path; omit it from the morph.
    const source = svg.cloneNode(true);
    source.querySelectorAll('path[stroke="none"]').forEach((node) => {
        if (node.getAttribute("d") === "M0 0h24v24H0z") node.remove();
    });

    let icon;
    try {
        icon = svgToIcon(source.outerHTML);
    } catch (error) {
        console.warn("Navigation icon cannot morph:", error);
        return;
    }

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    svg.replaceChildren(path);
    const morph = createMorph(path, icon, { reducedMotion: "user" });

    const update = () => {
        const active = (hoverCapable.matches && link.matches(":hover")) || link.matches(":focus-visible");
        morph.morphTo(active ? arrow : icon, "snappy");
    };

    link.addEventListener("pointerenter", update);
    link.addEventListener("pointerleave", update);
    link.addEventListener("focus", update);
    link.addEventListener("blur", update);
    hoverCapable.addEventListener("change", update);
    update();
});

const hamburger = document.getElementById("nav-hamburger");
const menuPath = hamburger?.querySelector("svg path");

if (menuPath) {
    const menuIcon = menuPath.getAttribute("d");
    const closeIcon = "M5 5l14 14M19 5L5 19";
    const morph = createMorph(menuPath, menuIcon, { reducedMotion: "user" });
    const update = () => {
        const open = hamburger.getAttribute("aria-expanded") === "true";
        const english = document.documentElement.dataset.navLang === "en";
        hamburger.setAttribute("aria-label", english
            ? (open ? "Close navigation menu" : "Open navigation menu")
            : (open ? "关闭导航菜单" : "打开导航菜单"));
        morph.morphTo(open ? closeIcon : menuIcon, "snappy");
    };

    new MutationObserver(update).observe(hamburger, {
        attributes: true,
        attributeFilter: ["aria-expanded"],
    });
    document.getElementById("nav-lang-toggle")?.addEventListener("click", update);
    update();
}
