(function () {
    "use strict";

    var toc = document.getElementById("TableOfContents");
    var tocScroller = document.querySelector(".toc .inner");
    var article = document.querySelector(".post-content");

    if (!toc || !tocScroller || !article) {
        return;
    }

    var links = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
    var sections = links.map(function (link) {
        var id;

        try {
            id = decodeURIComponent(link.hash.slice(1));
        } catch (_error) {
            id = link.hash.slice(1);
        }

        var heading = document.getElementById(id);
        var item = link.closest("li");

        if (!heading || !article.contains(heading) || !item) {
            return null;
        }

        return { heading: heading, item: item, link: link };
    }).filter(Boolean);

    if (!sections.length) {
        return;
    }

    var activeSection = null;
    var ticking = false;
    var tocHovered = false;

    function clearActiveItems() {
        toc.querySelectorAll("li.toc-active, li.toc-current").forEach(function (item) {
            item.classList.remove("toc-active", "toc-current");
        });

        links.forEach(function (link) {
            link.removeAttribute("aria-current");
        });
    }

    function keepCurrentItemVisible(item) {
        if (tocHovered || window.matchMedia("(max-width: 1239px)").matches) {
            return;
        }

        var itemTop = item.offsetTop;
        var itemBottom = itemTop + item.offsetHeight;
        var visibleTop = tocScroller.scrollTop;
        var visibleBottom = visibleTop + tocScroller.clientHeight;

        if (itemTop < visibleTop || itemBottom > visibleBottom) {
            tocScroller.scrollTo({
                top: Math.max(0, itemTop - (tocScroller.clientHeight / 2) + (item.offsetHeight / 2)),
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
            });
        }
    }

    function setActiveSection(section) {
        if (section === activeSection) {
            return;
        }

        clearActiveItems();
        activeSection = section;

        if (!section) {
            return;
        }

        section.item.classList.add("toc-current", "toc-active");
        section.link.setAttribute("aria-current", "location");

        var parentItem = section.item.parentElement && section.item.parentElement.closest("li");
        while (parentItem && toc.contains(parentItem)) {
            parentItem.classList.add("toc-active");
            parentItem = parentItem.parentElement && parentItem.parentElement.closest("li");
        }

        keepCurrentItemVisible(section.item);
    }

    function findActiveSection() {
        var activationLine = Math.min(160, Math.max(88, window.innerHeight * 0.2));
        var current = null;

        for (var index = 0; index < sections.length; index += 1) {
            if (sections[index].heading.getBoundingClientRect().top <= activationLine) {
                current = sections[index];
            } else {
                break;
            }
        }

        return current;
    }

    function update() {
        ticking = false;
        setActiveSection(findActiveSection());
    }

    function requestUpdate() {
        if (!ticking) {
            ticking = true;
            window.requestAnimationFrame(update);
        }
    }

    tocScroller.addEventListener("mouseenter", function () {
        tocHovered = true;
    });
    tocScroller.addEventListener("mouseleave", function () {
        tocHovered = false;
    });

    links.forEach(function (link) {
        link.addEventListener("click", function () {
            var matched = sections.find(function (section) {
                return section.link === link;
            });

            if (matched) {
                setActiveSection(matched);
            }
        });
    });

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    window.addEventListener("hashchange", requestUpdate);
    requestUpdate();
}());
