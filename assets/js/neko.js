(function onekoHome() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const header = document.querySelector(".home-info .entry-header h1");

    if (prefersReducedMotion.matches || coarsePointer.matches || !header) {
        return;
    }

    let headerAnchor = header.querySelector(".oneko-title-anchor");
    if (!headerAnchor) {
        headerAnchor = document.createElement("span");
        headerAnchor.className = "oneko-title-anchor";
        headerAnchor.style.display = "inline-block";
        while (header.firstChild) {
            headerAnchor.appendChild(header.firstChild);
        }
        header.appendChild(headerAnchor);
    }

    const currentScript = document.currentScript;
    const spriteUrl =
        currentScript && currentScript.dataset.onekoGif
            ? currentScript.dataset.onekoGif
            : "/hugo-neko/oneko.gif";

    const nekoEl = document.createElement("div");
    let resizeObserver = null;
    let frameCount = 0;
    let idleTime = 0;
    let idleAnimation = "sleeping";
    let idleAnimationFrame = 0;
    let lastFrameTimestamp = 0;

    let sleeping = true;
    let justAwake = false;

    let mousePosX = 0;
    let mousePosY = 0;

    let nekoPosX = 32;
    let nekoPosY = 32;
    const nekoSpeed = 10;

    const spriteSets = {
        idle: [[-3, -3]],
        alert: [[-7, -3]],
        scratchSelf: [
            [-5, 0],
            [-6, 0],
            [-7, 0],
        ],
        scratchWallN: [
            [0, 0],
            [0, -1],
        ],
        scratchWallS: [
            [-7, -1],
            [-6, -2],
        ],
        scratchWallE: [
            [-2, -2],
            [-2, -3],
        ],
        scratchWallW: [
            [-4, 0],
            [-4, -1],
        ],
        tired: [[-3, -2]],
        sleeping: [
            [-2, 0],
            [-2, -1],
        ],
        N: [
            [-1, -2],
            [-1, -3],
        ],
        NE: [
            [0, -2],
            [0, -3],
        ],
        E: [
            [-3, 0],
            [-3, -1],
        ],
        SE: [
            [-5, -1],
            [-5, -2],
        ],
        S: [
            [-6, -3],
            [-7, -2],
        ],
        SW: [
            [-5, -3],
            [-6, -1],
        ],
        W: [
            [-4, -2],
            [-4, -3],
        ],
        NW: [
            [-1, 0],
            [-1, -1],
        ],
    };

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const placeBesideHeader = () => {
        const headerRect = headerAnchor.getBoundingClientRect();
        const preferredX = headerRect.right + 10;
        const preferredY = headerRect.bottom - 24 + window.scrollY;

        nekoPosX = clamp(preferredX, 16, document.documentElement.clientWidth - 16);
        nekoPosY = Math.max(16, preferredY);

        nekoEl.style.left = `${nekoPosX - 16}px`;
        nekoEl.style.top = `${nekoPosY - 16}px`;
    };

    const setSprite = (name, frame) => {
        const sprite = spriteSets[name][frame % spriteSets[name].length];
        nekoEl.style.backgroundPosition = `${sprite[0] * 32}px ${sprite[1] * 32}px`;
    };

    const resetIdleAnimation = () => {
        idleAnimation = null;
        idleAnimationFrame = 0;
    };

    const idle = () => {
        idleTime += 1;

        if (
            idleTime > 10 &&
            Math.floor(Math.random() * 200) === 0 &&
            idleAnimation == null
        ) {
            const availableIdleAnimations = ["sleeping", "scratchSelf"];
            if (nekoPosX < 32) {
                availableIdleAnimations.push("scratchWallW");
            }
            if (nekoPosY < 32) {
                availableIdleAnimations.push("scratchWallN");
            }
            if (nekoPosX > window.innerWidth - 32) {
                availableIdleAnimations.push("scratchWallE");
            }
            if (nekoPosY > window.innerHeight - 32) {
                availableIdleAnimations.push("scratchWallS");
            }
            idleAnimation =
                availableIdleAnimations[
                    Math.floor(Math.random() * availableIdleAnimations.length)
                ];
        }

        switch (idleAnimation) {
            case "sleeping":
                if (idleAnimationFrame < 8 && !sleeping) {
                    setSprite("tired", 0);
                    break;
                }
                setSprite("sleeping", Math.floor(idleAnimationFrame / 4));
                if (idleAnimationFrame > 192 && !sleeping) {
                    resetIdleAnimation();
                }
                break;
            case "scratchWallN":
            case "scratchWallS":
            case "scratchWallE":
            case "scratchWallW":
            case "scratchSelf":
                setSprite(idleAnimation, idleAnimationFrame);
                if (idleAnimationFrame > 9) {
                    resetIdleAnimation();
                }
                break;
            default:
                setSprite("idle", 0);
                return;
        }

        idleAnimationFrame += 1;
    };

    const wakeUp = () => {
        sleeping = false;
        justAwake = true;
        idleAnimation = null;
        idleAnimationFrame = 0;
        idleTime = 999;

        nekoPosY -= window.scrollY;
        nekoPosX = clamp(nekoPosX, 16, window.innerWidth - 16);
        nekoPosY = clamp(nekoPosY, 16, window.innerHeight - 16);

        nekoEl.style.left = `${nekoPosX - 16}px`;
        nekoEl.style.top = `${nekoPosY - 16}px`;
        nekoEl.style.position = "fixed";
        nekoEl.style.pointerEvents = "none";
        nekoEl.style.cursor = "default";

        if (resizeObserver) {
            resizeObserver.disconnect();
        }
    };

    const frame = () => {
        frameCount += 1;

        const diffX = nekoPosX - mousePosX;
        const diffY = nekoPosY - mousePosY;
        const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

        if (!justAwake && (distance < nekoSpeed || distance < 48 || sleeping)) {
            idle();
            return;
        }

        idleAnimation = null;
        idleAnimationFrame = 0;

        if (idleTime > 1) {
            setSprite("alert", 0);
            idleTime = Math.min(idleTime, 7);
            idleTime -= 1;
            return;
        }

        justAwake = false;

        let direction = diffY / distance > 0.5 ? "N" : "";
        direction += diffY / distance < -0.5 ? "S" : "";
        direction += diffX / distance > 0.5 ? "W" : "";
        direction += diffX / distance < -0.5 ? "E" : "";

        setSprite(direction, frameCount);

        nekoPosX -= (diffX / distance) * nekoSpeed;
        nekoPosY -= (diffY / distance) * nekoSpeed;

        nekoPosX = clamp(nekoPosX, 16, window.innerWidth - 16);
        nekoPosY = clamp(nekoPosY, 16, window.innerHeight - 16);

        nekoEl.style.left = `${nekoPosX - 16}px`;
        nekoEl.style.top = `${nekoPosY - 16}px`;
    };

    const onAnimationFrame = (timestamp) => {
        if (!nekoEl.isConnected) {
            return;
        }

        if (!lastFrameTimestamp) {
            lastFrameTimestamp = timestamp;
        }

        if (timestamp - lastFrameTimestamp > 100) {
            lastFrameTimestamp = timestamp;
            frame();
        }

        window.requestAnimationFrame(onAnimationFrame);
    };

    nekoEl.id = "oneko";
    nekoEl.ariaHidden = true;
    nekoEl.style.width = "32px";
    nekoEl.style.height = "32px";
    nekoEl.style.position = "absolute";
    nekoEl.style.backgroundImage = `url(${spriteUrl})`;
    nekoEl.style.backgroundRepeat = "no-repeat";
    nekoEl.style.imageRendering = "pixelated";
    nekoEl.style.cursor = "pointer";
    nekoEl.style.zIndex = "2147483647";

    document.body.appendChild(nekoEl);
    placeBesideHeader();

    document.addEventListener(
        "mousemove",
        (event) => {
            mousePosX = event.clientX;
            mousePosY = event.clientY;
        },
        { passive: true },
    );

    document.addEventListener(
        "scroll",
        () => {
            if (sleeping) {
                placeBesideHeader();
            }
        },
        { passive: true },
    );

    window.addEventListener(
        "resize",
        () => {
            if (sleeping) {
                placeBesideHeader();
            }
        },
        { passive: true },
    );

    if ("ResizeObserver" in window) {
        resizeObserver = new ResizeObserver(() => {
            if (sleeping) {
                placeBesideHeader();
            }
        });
        resizeObserver.observe(headerAnchor);
    }

    nekoEl.addEventListener("click", wakeUp, { once: true });
    window.requestAnimationFrame(onAnimationFrame);
})();
