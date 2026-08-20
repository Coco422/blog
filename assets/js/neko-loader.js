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

    if ("requestIdleCallback" in window) {
        window.requestIdleCallback(load, { timeout: 1500 });
    } else {
        window.addEventListener("load", load, { once: true });
    }
})();
