# Deployment

This site is deployed with Cloudflare Pages.

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
