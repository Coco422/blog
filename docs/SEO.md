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

## Bing Webmaster 与 IndexNow

- Bing Webmaster 的博客资源使用 `https://blog.anluoying.com/`。2026-11-10 通过独立的 `863a01fea8cebbf489df014c0d4e6c19.blog.anluoying.com` CNAME → `verify.bing.com` 验证成功，Cloudflare 设置为仅 DNS、自动 TTL；它不承载网站流量，现有 blog 解析保持不变。回滚时仅移除此验证记录会影响后续所有权复核。
- 初次使用根目录 `static/BingSiteAuth.xml` 时，本地与 Bingbot UA 均取得 200 且文件匹配，但 Bing 两次报告无法访问，因而改用 DNS 验证；不要据此认定 Bing 已实际抓取网站，也不要关闭安全规则或授权导入全部 GSC 资源。
- 2026-11-10 已提交 `https://blog.anluoying.com/sitemap.xml`，Bing 控制台显示 Submitted / Processing；尚未给出抓取日期或发现 URL 数。完成验证与提交站点地图不代表已收录。
- IndexNow 使用根目录 `static/<32 位公钥>.txt` 证明网站所有权。这是协议要求公开的验证材料，不是图床、Cloudflare 或 Bing 的私密 API 凭据；不要把其他服务的密钥放进 `static/`。
- 验证文件允许抓取，但通过 `X-Robots-Tag: noindex` 避免成为搜索结果。`_headers` 中专用规则要放在源站通配规则之前，确保 CDN 保留独立的 noindex。不要在 robots.txt 中禁止访问验证文件。
- 先构建和审计，再预览需要通知的 URL；正式发布并确认线上公钥正确后才执行提交：

```bash
hugo --environment production --cleanDestinationDir --printI18nWarnings --printPathWarnings
python3 scripts/seo_audit.py
python3 scripts/indexnow_submit.py --sitemap public/sitemap.xml
# 首次接入可通知当前 sitemap；后续只通知实际新增或更新的 URL。
python3 scripts/indexnow_submit.py --submit https://blog.anluoying.com/posts/example/
```

最后一行的示例地址必须换成当前 production sitemap 中的真实 canonical URL。脚本默认 dry-run，会拒绝站外、查询参数、锚点及不在 sitemap 中的 URL；`--submit` 先核对线上验证文件，网络或 HTTP 错误不会自动重试。首次全量通知可显式使用 `--submit --sitemap public/sitemap.xml`，后续不要反复提交未变化的全站页面。

2026-11-10 首次通知 sitemap 的 136 个 URL 返回 HTTP 202；稍后单独通知首页返回 HTTP 200，公钥验证已通过。IndexNow 的 200 代表收到通知，202 代表收到且仍待验证公钥，都不保证抓取或收录。协议与接收端见 [IndexNow 官方文档](https://www.indexnow.org/documentation)及 [官方 FAQ](https://www.indexnow.org/faq)。不额外创建定时全量提交任务。

## Cloudflare Pages 环境

Hugo 的 Production 与 Preview 必须使用不同环境值：

| Scope | Variable | Value |
| --- | --- | --- |
| Production | `HUGO_ENVIRONMENT` | `production` |
| Preview | `HUGO_ENVIRONMENT` | `preview` |

`HUGO_VERSION=0.148.2` 仍需同时配置在 Production 和 Preview。

生产构建允许索引；非生产构建会输出 `noindex, follow`。Dooki 以 `blog-dc5.pages.dev` 为回源 Host，因此不能把这个源站直接 301 到正式域名，否则会造成回源循环。

源站索引隔离由两端配合完成：

- `static/_headers` 为 `blog-dc5.pages.dev` 及其部署子域名返回 `X-Robots-Tag: noindex, follow`。
- Dooki 仅在 `blog.anluoying.com` 的响应报头中，对 `X-Robots-Tag` 启用内容替换：`noindex, follow` → `index, follow`，报头默认值留空。不删除整个报头，也不把所有值一律改成 `index`。
- `/index.json` 仍有独立的 `noindex`。Cloudflare 合并同名头后，CDN 替换源站指令仍须保留这个 `noindex`；标签、搜索等 HTML 页也继续由 meta robots 控制。
- 两端必须一起维护。更换 CDN 前先配好同样的精确替换，再切流；回滚时先移除源站隔离规则并部署，再移除 CDN 替换，避免正式域名继承源站 `noindex`。
- 每次发布验证源站首页/文章为 `noindex`、正式首页/文章无 `noindex`、正式 `/index.json` 仍为 `noindex`。规则写法遵循 [Cloudflare Pages headers 文档](https://developers.cloudflare.com/pages/configuration/headers/)。

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

- `description` 以 50–90 个字符为编辑目标，直接说明问题、方法和结论，不放 Markdown、URL、代码或图片语法。脚本按 Unicode 字符计数并提示超限；这不是搜索引擎的硬性长度门槛，见 [Google 摘要说明](https://developers.google.com/search/docs/appearance/snippet)。
- 文章 `<title>` 不再附加站名；必要时用 `seoTitle` 提供简短搜索标题，正文 H1 保留 `title`，不改文章 URL。不用固定字符数判定标题质量，见 [Google 标题说明](https://developers.google.com/search/docs/appearance/title-link)。
- 模板已经输出文章标题 H1，正文从 H2（`##`）开始。
- 图片使用描述内容的 alt；`image.png`、`图片`和空 alt 只会得到兜底文本。
- 分享图依次使用 `cover.image`、文章 `images` / featured 资源、正文第一张 PNG/JPEG/WebP，最后才回退站点默认图；GIF 不自动作为分享图。Open Graph、Twitter Card 和 JSON-LD 共用同一来源。
- 新图上传前限制到合适的显示宽度，照片/插画优先 WebP，文字截图优先无损压缩；动图保留必要演示，优先更小的动画 WebP 或视频。不要为换格式牺牲文本可读性。
- 新增图床图片后运行 `python3 scripts/image_metadata.py`，再构建。`data/remote_images.json` 缓存原始宽高，图片模板按文中显示尺寸补齐比例；构建不联网取图。用法见 `scripts/README.md`。
- `lastmod` 必须是真实更新时间，不能晚于当前时间。
- 不为补齐字段而批量重写历史 `lastmod`，不因正文不足 500 字就扩写、合并或 noindex。判断文章是否完整回答问题；Google [没有偏好的固定字数](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)。
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

历史 GSC 快照（2026-08-15）：约 129 已编入、110 未编入，其中 noindex / 历史 URL / 外部 canonical 占多数；近 7 天展示仍是个位数。这不是当前索引数据，未编入项不要直接改 robots。

### 2026-11-10 定向优化

- 干净 production 构建和 SEO 审计通过；补齐《QQ接入大肥鱼》的 4 个描述性 alt、41 篇摘要，优化 5 个含糊标题及 4 个长标题的搜索展示，文章 URL 保持不变。
- 补充 SLM、DeepSeek、软考和 Nginx 共 8 篇文章的上下文内链；Agent（0）/（1）已有相互引用，不重复堆链接。
- `llms.txt` 保持 5 个核心条目，更新为两篇 DeepSeek 实测、Qwen3.8、浏览器自动化对比和 Agent 教程入口。
- 为现有 343 张正文图补齐宽高；DeepSeek 硬件对比文章的 4 张图从约 8.54 MB 缩至 1.55 MB，动画保留全部 75 帧和时长。原图、转换记录和上传校验保存在不公开的 `sources/seo/2026-11-10/`。
- 晚间复现并处理了 Dooki 的压缩缓存差异：首页和文章的 1 分钟缓存键增加 `Accept-Encoding` 维度，避免 identity、Brotli、gzip 共用同一份回源表示，并追加 `Vary: Accept-Encoding`。文章 identity 约 86.2 KB，Brotli 约 25.7 KB，gzip 约 25.1 KB；连续命中仍保持各自编码。最小压缩长度仍为 1 KiB，最大 32 MiB，算法保持默认；门槛和重新压缩选项的试验未改善现象，均已恢复。具体缓存契约和回滚见 `docs/DEPLOYMENT.md`。
- 晚间已登录 GSC 核对最新报告；具体口径和数据见下方基线。Bing 使用独立的博客资源与 DNS 验证，IndexNow 使用公开所有权验证文件接入，不能从仓库缺少验证文件推断历史账号状态。
- 保留现有字体加载方案。文楷 preload 与字体就绪后展示逻辑有关，性能调整应结合真实首屏数据一起验证，不能单独移除 preload。

生产发布核验（2026-11-10，提交 `286e5e5`）：正式首页和 DeepSeek 对比文为 200 且可索引，源站同路径返回 `X-Robots-Tag: noindex, follow`；正式 `/index.json` 仍是 `noindex`，标签与搜索页的 meta noindex 保留；sitemap 136 条，精选目录与新分享图已生效，Googlebot / GPTBot / ClaudeBot 均取得 200。晚间继续完成压缩缓存处理和 GSC 基线核验，并接入 Bing / IndexNow；其状态见相应章节。

### 2026-11-10 晚间 GSC 基线

- 资源为 `sc-domain:anluoying.com`。域名级索引报告更新于 11 月 6 日：165 已编入、234 未编入；未编入原因为 noindex 188、404 2、重定向 1、已抓取未收录 35、已发现未收录 8。该范围包含主域及子域、历史和非 sitemap URL，不能直接当作博客文章总数。
- 按博客 `https://blog.anluoying.com/sitemap.xml` 筛选后：136 个 URL 中，119 已编入、9 已抓取未收录、8 已发现未收录；没有 noindex / 404 / 重定向排除项。sitemap 状态成功，上次读取 11 月 7 日。
- 近 7 天按网页 URL 包含 `https://blog.anluoying.com/` 筛选：11 月 2–8 日，29 次点击、834 次曝光、CTR 3.5%、平均排名 7.0，搜索类型为网页（文本）。页面过滤后的聚合口径与未过滤的域名总计不同；本次优化发生在 11 月 10 日，这些是优化前的基线。
- 9 个已抓取未收录样本包含 OpenClaw 飞书集成、VS Code Server 离线下载、SLM-2、Harbor 鉴权等，不应简单归因于正文不足 500 字。8 个已发现未收录样本包括 10 月发布的 Go 基础、Linux 用户管理、screen、Nginx 两篇及 QQ 接入大肥鱼；先观察抓取，再按具体网页判断内容问题。
- 域名概览中的移动端和桌面 Core Web Vitals 均无数据，暂不能给出真实用户 LCP/CLS/INP 的改善结论。截图、样本 URL 和结构化基线保存在 `sources/seo/2026-11-10/`，不作为公共站点路径。
