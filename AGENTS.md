# Agent Notes

This is a Hugo static blog using the PaperMod theme as a git submodule.

## Commands

- Preview: `hugo server --bind 127.0.0.1 --port 1313 --baseURL http://127.0.0.1:1313/`
- Build: `hugo --printI18nWarnings --printPathWarnings`
- Submodules: `git submodule update --init --recursive`

## Boundaries

- Do not commit `public/`; it is generated output and ignored.
- Keep theme changes as local overrides under `layouts/`, `assets/css/extended/`, or `assets/js/` instead of editing `themes/PaperMod` directly.
- Keep secrets out of files. API keys used for asset generation or uploads must stay in environment variables.
- Prefer existing SVGs in `assets/bak/icons/` for navigation/UI icons before generating bitmap assets.

## Navigation

- Main navigation labels and icon names live in `hugo.yaml` under `menu.main[].params`.
- The local `layouts/partials/header.html` override renders icon + bilingual labels.
- `assets/js/nav-i18n.js` toggles only navigation labels between `zh` and `en`, storing the preference in `localStorage`.
- `assets/css/extended/nav-i18n.css` controls icon sizing and mobile wrapping.

## Deployment Notes

- PaperMod requires Hugo Extended `0.146.0` or newer.
- Cloudflare Pages uses separate Production and Preview environment scopes. Set `HUGO_VERSION=0.148.2` in both scopes or use an all-environments variable.
- If a PR Preview build logs `hugo@extended_0.144.2`, the Preview environment is not using the expected Hugo version even if Production succeeds.
