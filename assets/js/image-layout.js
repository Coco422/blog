const IMAGE_WRAPPER_SELECTOR = '.post-img-view';

function getStandaloneImages(element) {
    if (!(element instanceof HTMLParagraphElement)) return [];

    const hasText = Array.from(element.childNodes).some((node) => (
        node.nodeType === Node.TEXT_NODE && node.textContent.trim()
    ));
    if (hasText) return [];

    const children = Array.from(element.children);
    const onlyImagesAndBreaks = children.every((child) => (
        child.matches(`${IMAGE_WRAPPER_SELECTOR}, br`)
    ));
    if (!onlyImagesAndBreaks) return [];

    return children.filter((child) => child.matches(IMAGE_WRAPPER_SELECTOR));
}

function decorateImageRun(run) {
    if (!run.length) return;

    const row = run[0].paragraph;
    const images = run.flatMap((entry) => entry.images);
    row.replaceChildren(...images);
    row.classList.add('post-image-row');
    row.classList.toggle('post-image-row--multiple', images.length > 1);

    run.slice(1).forEach((entry) => entry.paragraph.remove());
}

function enhanceImageRows(container) {
    let run = [];

    Array.from(container.children).forEach((child) => {
        const images = getStandaloneImages(child);
        if (images.length) {
            run.push({ paragraph: child, images });
            return;
        }

        decorateImageRun(run);
        run = [];
    });

    decorateImageRun(run);
}

function initImageLayout() {
    document.querySelectorAll('.post-content').forEach((container) => {
        const parents = new Set(
            Array.from(container.querySelectorAll('p')).map((paragraph) => paragraph.parentElement)
        );
        parents.forEach(enhanceImageRows);
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initImageLayout, { once: true });
} else {
    initImageLayout();
}
