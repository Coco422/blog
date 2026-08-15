document.addEventListener("DOMContentLoaded", function () {
    var bar = document.querySelector(".reading-progress");
    if (!bar) return;

    var ticking = false;

    function update() {
        ticking = false;
        var doc = document.documentElement;
        var scrollable = doc.scrollHeight - doc.clientHeight;
        if (scrollable <= 0) {
            bar.style.display = "none";
            return;
        }
        bar.style.display = "";
        var progress = (window.scrollY || doc.scrollTop) / scrollable;
        if (progress < 0) progress = 0;
        if (progress > 1) progress = 1;
        bar.style.setProperty("--progress", progress);
    }

    function requestUpdate() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    update();
});
