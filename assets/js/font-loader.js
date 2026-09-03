(function waitForCustomFonts() {
    const root = document.documentElement;
    const reveal = () => {
        root.classList.remove("fonts-loading");
        root.removeAttribute("aria-busy");
    };

    if (!document.fonts || typeof document.fonts.load !== "function") {
        reveal();
        return;
    }

    const fonts = [
        '400 1em "Newsreader"',
        'italic 400 1em "Newsreader"',
        '400 1em "LXGW WenKai GB"',
        '400 1em "JetBrains Mono"',
    ];
    const timeout = new Promise((resolve) => window.setTimeout(resolve, 5000));
    const loaded = Promise.all(fonts.map((font) => document.fonts.load(font)));

    Promise.race([loaded, timeout]).then(reveal, reveal);
})();
