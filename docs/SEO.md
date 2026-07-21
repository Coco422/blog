# SEO 与搜索引擎收录

本站的正式地址是 <https://blog.anluoying.com/>，站点地图是 <https://blog.anluoying.com/sitemap.xml>。

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
- 不生成 `llms-full.txt` 或重复全站正文的知识包，避免内容过期和维护两套事实源。
- AI 引用优化优先放在正文：开头直接回答、注明实测环境与日期、给出可核验来源、明确结论适用边界。
- FAQ schema 只在页面确实存在可见 FAQ 时使用，不为 GEO 批量制造问答。

## 发布内容检查

- `description` 写 50–90 个中文字符，直接说明问题、方法和结论，不放 Markdown、URL、代码或图片语法。
- 模板已经输出文章标题 H1，正文从 H2（`##`）开始。
- 图片使用描述内容的 alt；`image.png`、`图片`和空 alt 只会得到兜底文本。
- `lastmod` 必须是真实更新时间，不能晚于当前时间。
- 高度转载或重复内容应补充原创分析，或设置 `canonicalURL` 并从 sitemap 移除。
- 已发布文章不要随意修改 URL；确需改名时必须保留永久重定向。

## 本地验证

```bash
hugo --printI18nWarnings --printPathWarnings
python3 scripts/seo_audit.py
```

部署后再检查：

```bash
curl -I https://blog.anluoying.com/
curl https://blog.anluoying.com/robots.txt
curl https://blog.anluoying.com/sitemap.xml
```
