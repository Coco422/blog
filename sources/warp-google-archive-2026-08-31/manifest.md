# Source Pack: WARP Google 解锁脚本

## Goal

- 给后续博客草稿、脚本接管和可维护版本改造保留原始证据。
- 固化 2026-08-31 抓取到的页面、脚本、配图、响应头和官方对照资料；不在本机执行原脚本。

## Contents

- `S01` | web | WARP 一键安装独立页 | <https://vpszdm.com/warp-google.html> | `web/warp-google.html` | 2026-08-31 | 用户提供的入口，页面 CSS/JS 均内联。
- `S02` | script | 原作者 WARP Google 脚本 v1.0.0 | <https://vpszdm.com/warp-google.sh> | `files/warp-google.sh` | 2026-08-31 | 原样归档，SHA-256 为 `4c45421ad25eac15bf09dda25d6296cfef01e111e086f2f02001531bdd4fc52a`。
- `S03` | web | 原作者配套文章 | <https://vpszdm.com/warp1/> | `web/warp1.html` | 2026-08-31 | 补充脚本使用场景和作者截图。
- `S04` | media | 原文章题图和操作截图 | 原文章内 `vpszdm.com` / `boat.vpszdm.com` 图片地址 | `media/*.png` | 2026-08-31 | 共 6 张 PNG，保留原始尺寸。
- `S05` | media | 独立页所用 Google Fonts | 页面引用的 Google Fonts / gstatic 地址 | `web/google-fonts.css`、`media/fonts/*.ttf` | 2026-08-31 | JetBrains Mono 与 Sora，共 6 个字重文件。
- `S06` | official | Cloudflare WARP Linux 安装文档 | <https://developers.cloudflare.com/warp-client/get-started/linux/> | `official/cloudflare-warp-linux.md` | 2026-08-31 | 核对官方包与首次连接命令。
- `S07` | official | Cloudflare WARP modes 文档 | <https://developers.cloudflare.com/warp-client/warp-modes/> | `official/cloudflare-warp-modes.md` | 2026-08-31 | 核对 Local proxy、SOCKS5 和流量边界。
- `S08` | official | Cloudflare Linux 包仓库页面 | <https://pkg.cloudflareclient.com/> | `official/cloudflare-package-repository.html` | 2026-08-31 | 核对当前支持的发行版、APT/YUM 配置。
- `S09` | official | Google 用户服务 IP 段 | <https://www.gstatic.com/ipranges/goog.json> | `official/google-goog.json` | 2026-08-31 | 快照内含 130 条 IPv4、15 条 IPv6 前缀。
- `S10` | official | Google Cloud IP 段 | <https://www.gstatic.com/ipranges/cloud.json> | `official/google-cloud.json` | 2026-08-31 | 用于辨认原脚本中可能过宽、混入云服务的网段。
- `S11` | metadata | HTTP 响应头 | 对应 S01、S02、S03 | `headers/*.headers` | 2026-08-31 | 保留抓取时的 `Last-Modified`、`ETag` 等信息。

所有文件哈希见 `checksums.sha256`，静态审计见 `audit.md`。

## Gaps

- 页面声称“代码完全开源”，但页面、脚本和配套文章都没有给出明确许可证，也没有给出可确认的公开源码仓库。公开再分发原脚本和截图前，需要作者补充许可证或明确授权。
- 原脚本没有版本历史、tag 或 commit，只能用抓取时间、响应头与 SHA-256 标识当前快照。
- 没有在 VPS 上执行脚本；当前只完成来源核对、`bash -n` 静态语法检查和人工代码审计。
- Cloudflare WARP、Google IP 段、发行版支持范围和 `warp-cli` 命令都可能继续变化，归档只能保证“找得回来”，不能保证未来仍可直接运行。

## Next

- 先由 Ray 审阅博客草稿和 `audit.md`。
- 获得再分发授权后，再决定是否把原始快照放进博客的下载目录。
- 真正要长期使用时，基于审计结果另写可维护版本：保留 Cloudflare 官方包来源，动态读取 Google 官方 IP 清单，避免覆盖系统文件，并在一次性 VPS 上完成安装、重启、分流和卸载回归测试。
