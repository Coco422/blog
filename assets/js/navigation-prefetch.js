(function scheduleNavigationPrefetch() {
    const connection = navigator.connection;
    if (connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType))) {
        return;
    }

    const internalUrl = (href) => {
        if (!href) return null;
        const url = new URL(href, window.location.href);
        return url.origin === window.location.origin && url.href !== window.location.href
            ? url.href
            : null;
    };
    const navigationUrls = Array.from(document.querySelectorAll("#menu a"))
        .map((link) => internalUrl(link.href))
        .filter(Boolean);
    const contentUrls = [
        document.querySelector(".post-entry .entry-link")?.href,
        document.querySelector(".pagination .next")?.href,
    ].map(internalUrl).filter(Boolean);

    const prefetch = (urls) => {
        urls.forEach((url) => {
            const exists = Array.from(document.querySelectorAll('link[rel="prefetch"]'))
                .some((link) => link.getAttribute("href") === url);
            if (exists) {
                return;
            }
            const link = document.createElement("link");
            link.rel = "prefetch";
            link.as = "document";
            link.fetchPriority = "low";
            link.href = url;
            document.head.appendChild(link);
        });
    };

    const scheduleContent = () => {
        if ("requestIdleCallback" in window) {
            window.requestIdleCallback(() => prefetch(contentUrls), { timeout: 5000 });
        } else {
            window.setTimeout(() => prefetch(contentUrls), 2500);
        }
    };

    // The CDN path has noticeable and sometimes highly variable TTFB. Start
    // warming the small top-level pages as soon as the deferred bundle runs.
    prefetch(navigationUrls);

    if (document.readyState === "complete") {
        scheduleContent();
    } else {
        window.addEventListener("load", scheduleContent, { once: true });
    }
})();
