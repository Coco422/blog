(function () {
  const toggle = document.getElementById("nav-lang-toggle");
  if (!toggle) {
    return;
  }

  const allowedLanguages = new Set(["zh", "en"]);
  const defaultLang = allowedLanguages.has(toggle.dataset.defaultLang)
    ? toggle.dataset.defaultLang
    : "zh";
  const storageKey = toggle.dataset.storageKey || "anluoying-nav-language";
  const currentLabel = toggle.querySelector(".nav-lang-current");

  function getSavedLanguage() {
    try {
      const saved = window.localStorage.getItem(storageKey);
      return allowedLanguages.has(saved) ? saved : defaultLang;
    } catch (_) {
      return defaultLang;
    }
  }

  function saveLanguage(lang) {
    try {
      window.localStorage.setItem(storageKey, lang);
    } catch (_) {
      // Ignore storage failures in private browsing or locked-down webviews.
    }
  }

  function setNavigationLanguage(lang) {
    const safeLang = allowedLanguages.has(lang) ? lang : defaultLang;
    document.documentElement.dataset.navLang = safeLang;

    document.querySelectorAll("[data-nav-label]").forEach((label) => {
      const nextText = safeLang === "zh" ? label.dataset.labelZh : label.dataset.labelEn;
      if (nextText) {
        label.textContent = nextText;
      }
    });

    document.querySelectorAll("[data-nav-title-en][data-nav-title-zh]").forEach((link) => {
      const nextTitle = safeLang === "zh" ? link.dataset.navTitleZh : link.dataset.navTitleEn;
      if (nextTitle) {
        link.title = nextTitle;
        link.setAttribute("aria-label", nextTitle);
      }
    });

    const nextLang = safeLang === "zh" ? "en" : "zh";
    const currentText = safeLang.toUpperCase();
    const actionLabel = safeLang === "zh" ? "Switch navigation to English" : "切换导航到中文";
    toggle.setAttribute("aria-pressed", safeLang === "zh" ? "true" : "false");
    toggle.setAttribute("aria-label", `${currentText} · ${actionLabel}`);
    toggle.title = actionLabel;

    if (currentLabel) {
      currentLabel.textContent = currentText;
      currentLabel.dataset.nextLang = nextLang;
    }
  }

  setNavigationLanguage(getSavedLanguage());

  toggle.addEventListener("click", () => {
    const currentLang = document.documentElement.dataset.navLang || defaultLang;
    const nextLang = currentLang === "zh" ? "en" : "zh";
    saveLanguage(nextLang);
    setNavigationLanguage(nextLang);
  });
})();
