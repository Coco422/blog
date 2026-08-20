(function scheduleNavigationPrefetch() {
    const urls = Array.from(new Set([
        document.querySelector(".post-entry .entry-link")?.href,
        document.querySelector(".pagination .next")?.href,
    ].filter(Boolean)));
    const connection = navigator.connection;

    if (!urls.length || (connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType)))) {
        return;
    }

    const prefetch = () => {
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

    const schedule = () => {
        if ("requestIdleCallback" in window) {
            window.requestIdleCallback(prefetch, { timeout: 5000 });
        } else {
            window.setTimeout(prefetch, 2500);
        }
    };

    if (document.readyState === "complete") {
        schedule();
    } else {
        window.addEventListener("load", schedule, { once: true });
    }
})();
