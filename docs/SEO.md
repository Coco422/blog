# SEO 与搜索引擎收录

本站的正式地址是 <https://blog.anluoying.com/>，站点地图是 <https://blog.anluoying.com/sitemap.xml>。

这份文档是 SEO/GEO 的唯一说明。Codex 的每周巡检、本地审计脚本、模板覆盖和后续改动都对着这里维护，不要另开第二套清单。

## 共同维护

Codex 在 2026-07-21 落地了收录、canonical、结构化数据和 GEO 入口（`452da2a`），之后用自动化 `seo-geo` 做每周只读巡检。Grok 或人工改 SEO 时：

1. 先读本文、`scripts/seo_audit.py` 和现有 `layouts/partials/seo/` 覆盖。
2. 优先修回归和内容元数据，不平行再写一套 schema / robots / llms 方案。
3. 巡检保持只读；要改代码或请求编入索引，先对照本文的索引策略和“不做的事”。
4. 构建审计必须用干净的 production 输出，避免本机陈旧 `public/` 误报：

```bash
hugo --environment production --cleanDestinationDir --printI18nWarnings --printPathWarnings
python3 scripts/seo_audit.py
```

### 仓库内产物

| 路径 | 作用 |
| --- | --- |
| `hugo.yaml` | `baseURL`、站点描述、作者实体、`sameAs`、首页标题 |
| `layouts/partials/seo/data.html` | title / description / canonical / noindex / 分页 |
| `layouts/partials/templates/schema_json.html` | WebSite、Person、BreadcrumbList、BlogPosting |
| `layouts/partials/templates/opengraph.html` | Open Graph |
| `layouts/partials/related_posts.html` | 相关文章内链 |
| `layouts/_default/rss.xml` | 只输出可索引、非转载文章 |
| `static/llms.txt` | 人工精选的 Agent 阅读目录 |
| `static/_redirects` | 旧 URL 永久重定向 |
| `static/_headers` | 安全头；`/index.json` 的 `X-Robots-Tag: noindex` |
| `scripts/seo_audit.py` | 源数据和 `public/` 回归检查 |
| `content/tags/_index.md`、`content/posts/_index.md` | 标签页和 `/posts/` 列表 noindex 并退出 sitemap |

Codex 每周巡检配置在本机 `$CODEX_HOME/automations/seo-geo/`，记忆文件是 `memory.md`。巡检结论应回写到那份记忆，策略变更才改本文。

## Google Search Console

推荐创建 `anluoying.com` 的 Domain property，并使用 Cloudflare DNS TXT 记录完成验证。DNS 验证不需要在 Hugo 中保留 `google-site-verification` 标签，也不要使用占位值冒充验证码。

验证后执行：

1. 在“站点地图”中提交 `https://blog.anluoying.com/sitemap.xml`。
2. 用“网址检查”检查首页和近期重点文章。
3. 对尚未收录且允许编入索引的重点页面点击“请求编入索引”。
4. 在“网页”报告中持续查看 `已发现 - 尚未编入索引`、`已抓取 - 尚未编入索引`、重复网页和服务器错误。

Search Console 是判断 Google 是否抓取、选择 canonical 和拒绝收录原因的主要官方入口；服务器日志可补充确认爬虫访问，`site:` 查询只能作为粗略参考。

## Cloudflare Pages 环境

Hugo 的 Production 与 Preview 必须使用不同环境值：

| Scope | Variable | Value |
| --- | --- | --- |
| Production | `HUGO_ENVIRONMENT` | `production` |
| Preview | `HUGO_ENVIRONMENT` | `preview` |

`HUGO_VERSION=0.148.2` 仍需同时配置在 Production 和 Preview。

生产构建允许索引；非生产构建会输出 `noindex, follow`。如果默认 `*.pages.dev` 域名仍能公开访问，建议在 Cloudflare 配置 301 重定向到 `https://blog.anluoying.com/`，避免长期保留第二套可访问域名。

## 当前索引策略

- 首页、文章页、分类页、About 和友链页允许索引。
- `/tags/` 及标签详情页保留站内导航，但使用 `noindex, follow` 并退出 sitemap。
- `/posts/` 与首页内容重复，因此使用 `noindex, follow` 并退出 sitemap。
- 搜索页、归档页和隐藏文章使用 `noindex, follow` 并退出 sitemap。
- 分页页使用自身 canonical、独立页码标题，以及 `rel=prev/next`。

## GEO 与 Agent 可读入口

- `/llms.txt` 是一份人工维护的精选阅读目录，列出 About、核心原创文章、RSS 与 sitemap。
- `llms.txt` 目前是社区提案，不是 Google 或主流 AI 搜索公开确认的排名因素；只把它当作低成本、可回滚的实验。
- 不生成 `llms-full.txt`、按页 Markdown 镜像或重复全站正文的知识包，避免内容过期和维护两套事实源。
- 不提供 `openapi.json`。这是静态博客，没有可发现的 HTTP API，空规范只会给 Agent 错误入口。
- AI 引用优化优先放在正文：开头直接回答、注明实测环境与日期、给出可核验来源、明确结论适用边界。
- Google Search 已不再展示 FAQ rich result，不为 SEO/GEO 默认生成 `FAQPage` schema。正文只在真实问题能帮助读者时保留可见 FAQ；若其他消费者需要结构化数据，先核对其最新官方要求。
- 新发布的高价值原创实测文，评估后可替换 `static/llms.txt` 里的核心条目，不要把目录扩成全站列表。

## 和常见 SEO/GEO 清单的对照

对照 2026-08-19 这类公开清单（sitemap、robots、站长工具、标题描述、canonical、301、JSON-LD、速度、内链、llms.txt、openapi、Markdown 镜像、Brave、无障碍、外链）时，以本站已落地策略为准，不要按清单逐条补齐。

已经落地：

- sitemap、robots、canonical、分页 `rel=prev/next`、HTTP→HTTPS 301
- 生产环境 title / description / Open Graph / Twitter Card
- JSON-LD：WebSite、Person、BreadcrumbList、BlogPosting
- 标签页、`/posts/` 列表、搜索、归档 noindex 并退出 sitemap
- 转载文使用 `canonicalURL` 并退出 sitemap 与 RSS
- 相关文章、分类页、旧 URL `_redirects`
- `/llms.txt`、作者 `sameAs`、图片 alt 兜底检查
- `scripts/seo_audit.py` 覆盖元数据、H1、JSON-LD、sitemap、RSS、内链、页内锚点和 llms 链接

有意不做：

- `openapi.json`
- `llms-full.txt` 或 `about.md` 这类页面 Markdown 镜像
- 批量 FAQ schema
- 为 GEO 改写标题但不补充真实内容

仍属站外或人工操作，不靠仓库自动完成：

- Google Search Console、Bing Webmaster、Brave Search 提交与验证
- Cloudflare Bot Fight / 预览域名是否误伤爬虫或形成第二套可索引域名
- 无障碍（键盘、对比度、表单、ARIA）专项扫描
- 高质量外链、Reddit / YouTube 等内容分发
- Core Web Vitals 的真实用户数据（需 Search Console 或 CrUX）

## 发布内容检查

- `description` 写 50–90 个中文字符，直接说明问题、方法和结论，不放 Markdown、URL、代码或图片语法。
- 模板已经输出文章标题 H1，正文从 H2（`##`）开始。
- 图片使用描述内容的 alt；`image.png`、`图片`和空 alt 只会得到兜底文本。
- `lastmod` 必须是真实更新时间，不能晚于当前时间。
- 高度转载或重复内容应补充原创分析，或设置 `canonicalURL` 并从 sitemap 移除。
- 已发布文章不要随意修改 URL；确需改名时必须保留永久重定向。

## 本地验证

```bash
hugo --environment production --cleanDestinationDir --printI18nWarnings --printPathWarnings
python3 scripts/seo_audit.py
```

不要在未 `--cleanDestinationDir` 的旧 `public/` 上审计。2026-08-15 巡检里，本机残留分页文件曾把末页 canonical 误报成 `localhost`。

部署后再检查：

```bash
curl -I https://blog.anluoying.com/
curl https://blog.anluoying.com/robots.txt
curl https://blog.anluoying.com/sitemap.xml
curl https://blog.anluoying.com/llms.txt
```

## 每周巡检

Codex 自动化 `seo-geo` 每周六运行，只读。报告应包含：

- 干净 production 构建后的 `scripts/seo_audit.py` 结果
- 线上首页/最新文的 robots、canonical、JSON-LD、HTTP 状态
- 若能登录：Search Console 的索引数量、未编入原因、sitemap 状态、近 7 天展示/点击/排名
- GEO：`llms.txt` 链接是否仍指向可索引原创页，近期文章是否答案前置、有环境/日期/边界

把“旧 URL 被 301”记为正常。P0 只留给线上不可抓取、错误 noindex、错误 canonical 或审计回归。

最近一次巡检记忆（2026-08-15）：技术面通过；GSC 约 129 已编入、110 未编入，其中 noindex / 历史 URL / 外部 canonical 占多数；近 7 天展示仍是个位数。未编入项不要直接改 robots。
