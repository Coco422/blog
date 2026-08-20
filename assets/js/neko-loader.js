(function loadOnekoWhenIdle() {
    const currentScript = document.currentScript;
    const nekoScript = currentScript && currentScript.dataset.onekoScript;
    const nekoGif = currentScript && currentScript.dataset.onekoGif;

    if (!nekoScript) {
        return;
    }

    const load = () => {
        const script = document.createElement("script");
        script.src = nekoScript;
        if (nekoGif) {
            script.dataset.onekoGif = nekoGif;
        }
        document.body.appendChild(script);
    };

    const schedule = () => {
        if ("requestIdleCallback" in window) {
            window.requestIdleCallback(load, { timeout: 1500 });
        } else {
            window.setTimeout(load, 1000);
        }
    };

    if (document.readyState === "complete") {
        schedule();
    } else {
        window.addEventListener("load", schedule, { once: true });
    }
})();
