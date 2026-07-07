(function navMobile() {
    const hamburger = document.getElementById("nav-hamburger");
    const menu = document.getElementById("menu");

    if (!hamburger || !menu) {
        return;
    }

    const closeMenu = () => {
        menu.classList.remove("nav-menu-open");
        hamburger.setAttribute("aria-expanded", "false");
    };

    hamburger.addEventListener("click", () => {
        const isOpen = menu.classList.toggle("nav-menu-open");
        hamburger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    menu.addEventListener("click", (event) => {
        if (event.target.closest("a")) {
            closeMenu();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeMenu();
        }
    });

    window.addEventListener(
        "resize",
        () => {
            if (window.innerWidth > 768) {
                closeMenu();
            }
        },
        { passive: true },
    );
})();
