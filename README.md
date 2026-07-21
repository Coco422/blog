# 安落滢 Blog

Hugo + PaperMod powered personal blog for technical notes, life records, and search-friendly article archives.

## Quick Start

```bash
git submodule update --init --recursive
hugo server --bind 127.0.0.1 --port 1313 --baseURL http://127.0.0.1:1313/
```

Open <http://127.0.0.1:1313/> for local preview.

## Build

```bash
hugo
```

The generated site is written to `public/`, which is ignored by git.

## Requirements

- Hugo Extended `0.146.0` or newer. The checked-in PaperMod submodule declares this minimum version.
- Python 3.11+ only for optional helper scripts under `scripts/`.

## Project Map

- `hugo.yaml` - site configuration, menus, PaperMod params, and security headers.
- `content/` - blog posts and section pages.
- `layouts/` - local overrides for PaperMod templates and partials.
- `assets/css/extended/` - custom CSS bundled through Hugo Pipes.
- `assets/js/` - custom JavaScript bundled through Hugo Pipes.
- `assets/bak/icons/` - local SVG icon set reused by navigation and UI overrides.
- `scripts/` - image migration and link repair utilities.
- `static/` - files copied directly into the published site.
- `docs/` - project docs and deployment notes.

SEO implementation and Google Search Console steps are documented in `docs/SEO.md`.

## Deployment

The site deploys on Cloudflare Pages. Keep `HUGO_VERSION` configured for both Production and Preview environments; see `docs/DEPLOYMENT.md`.
