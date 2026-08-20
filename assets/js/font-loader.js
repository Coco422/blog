(function scheduleCustomFonts() {
    const connection = navigator.connection;
    if (connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType))) {
        return;
    }

    const enableFont = () => {
        document.documentElement.classList.add("font-custom-enabled");
    };

    const schedule = () => {
        if ("requestIdleCallback" in window) {
            window.requestIdleCallback(enableFont, { timeout: 3000 });
        } else {
            window.setTimeout(enableFont, 1500);
        }
    };

    if (document.readyState === "complete") {
        schedule();
    } else {
        window.addEventListener("load", schedule, { once: true });
    }
})();
