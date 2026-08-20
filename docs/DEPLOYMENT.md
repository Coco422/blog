# Deployment

Cloudflare Pages is the origin. Production traffic for `blog.anluoying.com` first enters Dooki CDN, which then fetches from the Pages origin.

```text
Browser → blog.anluoying.com → Dooki CDN → blog-dc5.pages.dev
```

## Build Settings

- Build command: `hugo`
- Build output directory: `public`
- Hugo requirement: Hugo Extended `0.146.0` or newer

The current PaperMod submodule declares `min_version = "0.146.0"`, so older Cloudflare build images fail before rendering completes.

## Cloudflare Pages Environment Variables

Set the following variable in both Production and Preview environments:

| Name | Value |
| --- | --- |
| `HUGO_VERSION` | `0.148.2` |

另外分别设置 Hugo 环境，避免 Preview 被搜索引擎索引：

| Scope | Name | Value |
| --- | --- | --- |
| Production | `HUGO_ENVIRONMENT` | `production` |
| Preview | `HUGO_ENVIRONMENT` | `preview` |

Cloudflare Pages treats Production and Preview as separate environment scopes. A successful `main` deployment only proves the Production scope is configured. Pull request and non-production branch checks use the Preview scope.

## Failure Pattern

If a Preview build fails with logs like:

```text
Detected the following tools from environment: hugo@extended_0.144.2
WARN Module "PaperMod" is not compatible with this Hugo version: Min 0.146.0
ERROR => hugo v0.146.0 or greater is required for hugo-PaperMod to build
```

check the Preview environment variables first. The later `partial "google_analytics.html" not found` error can appear as a secondary render failure after the Hugo version check has already failed.

If post comments do not load even though `comments: true` is set in front matter, check the Content Security Policy. Giscus needs `https://giscus.app` in `script-src` and `frame-src`, plus `https://giscus.app` and `https://api.github.com` in `connect-src`.

## Local Verification

```bash
hugo version
hugo --printI18nWarnings --printPathWarnings
```

Use Hugo Extended `0.146.0` or newer locally so local results match Cloudflare.

SEO、Search Console 与 sitemap 操作见 [SEO.md](SEO.md)。

## CDN Contract

The following rules are the provider-independent contract. Preserve them when changing CDN vendors instead of copying the current console settings mechanically.

### Origin and TLS

- Origin URL: `https://blog-dc5.pages.dev:443`.
- Origin Host and TLS SNI must be `blog-dc5.pages.dev`; do not send `blog.anluoying.com` as the origin Host unless that custom domain is also attached to the Pages project.
- Redirect HTTP to HTTPS and keep HTTP/2 enabled. HTTP/3 is optional and should only be enabled after compatibility testing.
- The CDN certificate must cover `blog.anluoying.com` and renew automatically.

### Cache policy

| Resource | Required behavior | Reason |
| --- | --- | --- |
| HTML | Override at the edge for 1 minute; ignore query parameters in the cache key | Edge hits remove most Pages round trips while limiting deployment staleness to about one minute |
| Fingerprinted JS | Cache for one year with `immutable` | The content hash changes whenever the file changes |
| Fonts | Cache for one year with `immutable` | Font URLs are versioned or stable build artifacts |
| Stable assets such as favicon and logo | Revalidate, or purge their exact URLs after replacement | Their paths do not contain a content hash |
| Redirects, `robots.txt`, sitemap and feeds | Revalidate against the origin | These files may change without a new URL |

Enable `Age` and a cache-status response header so a request can be diagnosed without opening the CDN console. A healthy immutable asset should progress from `MISS` or `UPDATING` to `HIT`, with an increasing `Age` value.

The current Dooki rules are deliberately narrow:

- `首页: /` → 1 minute, ignore URI parameters.
- `URL正则匹配: ^/.+/$` → 1 minute, ignore URI parameters. This covers Hugo's trailing-slash article, taxonomy, pagination and section URLs without matching files such as JavaScript, fonts, feeds or `index.json`.

One minute is the safety ceiling without an automatic purge hook. After a deploy, either wait for that TTL or invalidate the affected HTML URLs when immediate visibility matters. Do not use a long "cache everything" HTML rule.

### Compression

- Enable Brotli with gzip fallback for HTML, CSS, JavaScript, JSON, XML, SVG and text responses.
- Do not recompress content that is already compressed. In particular, WOFF2, PNG, JPEG and WebP normally gain nothing from another compression pass.
- Preserve `Vary: Accept-Encoding` when the CDN stores compressed variants.

### Fonts and first paint

Fonts are self-hosted under `/fonts/`, so they use the same Dooki → Pages path as the rest of the site. All custom fonts remain outside the critical rendering path:

- The initial render uses system serif, sans-serif and monospace fonts.
- `assets/js/font-loader.js` enables Newsreader, LXGW WenKai and JetBrains Mono only after the page `load` event and an idle callback.
- Custom faces use `font-display: optional`; a slow first visit keeps system fonts instead of producing a late disruptive swap.
- Data Saver and 2G connections do not request custom fonts.
- Do not preload custom fonts.
- Keep font sources and unused experiments under `assets/font-sources/`, which Hugo does not publish directly. Only runtime WOFF2 files belong in `static/fonts/`.
- After publishing text with new rare characters, regenerate the subset with `python3 scripts/subset_wenkai_font.py` as documented in `scripts/README.md`.

If fonts are ever moved to a separate hostname, add the correct `Access-Control-Allow-Origin` response header and update CSP `font-src` before changing the CSS URLs.

### First-paint budget

Page visibility has priority over typography and interaction enhancements:

- The homepage receives a dedicated critical stylesheet containing only the base layout, header, footer, post list, navigation, pagination and design tokens. Other pages retain the complete stylesheet. Both are inlined in `<head>`, so first paint does not wait for a second CDN request.
- The first-render path is HTML plus its inline CSS. The deferred page bundle does not block parsing.
- The cat animation waits until the page `load` event and an idle callback.
- Giscus waits for the page `load` event, then does not request its client or iframe until the comment container is within 800 px of the viewport.
- Mermaid waits until the page `load` event and an idle callback before downloading from jsDelivr.
- Fancybox is omitted from the homepage and loads on content pages only after image-gallery intent such as hover, focus, pointer down or click.
- After `load` and an idle callback, the homepage prefetches the first visible article and the next pagination page at low priority. Data Saver and 2G connections skip this work.

Do not add font preloads, synchronous third-party scripts, render-blocking external CSS or eager comments without measuring the first-render impact.

## CDN Migration Checklist

1. Lower the DNS TTL before the planned migration.
2. Configure the Pages origin, origin Host/SNI, certificate, HTTPS redirect and compression on the new CDN.
3. Recreate the cache policy above, including the two one-minute HTML rules. Do not start with a blanket "cache everything" rule.
4. Test the CDN-provided temporary hostname or a hosts-file override before changing public DNS.
5. Verify HTML, a fingerprinted JS file, a font, favicon, `robots.txt`, sitemap and a redirect.
6. Change DNS while keeping the previous CDN configuration available for rollback.
7. Test several networks and regions. ITDog document timing alone is insufficient; also inspect browser first paint, font completion and the request waterfall.
8. After DNS propagation, keep the old service until logs show that meaningful traffic has moved away.

## Production Smoke Check

```bash
curl -I https://blog.anluoying.com/
curl -I -H 'Accept-Encoding: br,gzip' https://blog.anluoying.com/js/<fingerprinted-bundle>.js
curl -I https://blog.anluoying.com/fonts/lxgw-wenkai-gb-site-subset.woff2
curl -I https://blog.anluoying.com/favicon-32x32.png
```

Expected results:

- HTML becomes `HIT` and exposes an `Age` below 60 seconds.
- Fingerprinted JavaScript and fonts become `HIT` and expose a growing `Age`.
- Compressible text returns `Content-Encoding: br` or gzip.
- WOFF2 and images return their native content type without redundant compression.
- The favicon and navigation logo return the expected byte size after a replacement or targeted purge.
