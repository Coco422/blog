---
title: Camoufox、Patchright、Nodriver 本地实测：个人信息中心如何少被反爬拦截
description: 为了给个人信息中心补上无 RSS、无公开 API 的平台，我在 macOS 上对比实测四种浏览器自动化方案，记录检测结果、登录持久化和适用边界。
date: 2026-08-31T20:51:19+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-09-01T18:01:46+08:00
showLastMod: true
tags:
  - Camoufox
  - Patchright
  - Nodriver
  - Playwright
categories:
  - 杂技浅尝
---

最近想做一个的信息中心，把平时会刷的几个平台聚合到一起。

其实是想搞个 AIHOT MAX，虽然卡兹克的 AIHOT 已经挺好用了，但是我的信息源不只有 AI 圈子，所以我还想扩充一下，也许（也能挣点，你说是不是）

有 RSS 的站当然好办，我之前已经搭过 [FreshRSS](/posts/freshrss-self-hosted/)。问题是，不是所有平台都有 RSS，也不是所有平台都愿意提供公开 API。剩下的路似乎只有模拟我平时浏览网页的行为，结果普通爬虫和 Playwright 又经常被拦。

所以问题就来了：除了 Camoufox，还有哪些相似方案？它们在本机跑起来到底有什么区别？

我在同一台 Mac、同一网络出口下，对比了原生 Playwright、Patchright、Camoufox 和 Nodriver。先说这次短测的结论：**原生 Playwright 的自动化特征最明显；Camoufox 在 headless 模式下隐藏得最完整；Patchright 和 Nodriver 能消掉 `navigator.webdriver`，但仍会暴露 `HeadlessChrome` UA。**

不过这不等于 Camoufox 可以无脑通过所有平台。真实风控还会看 IP、TLS、账号状态、访问频率和行为序列，公开检测页变绿只是其中一小块。

## 这几种方案到底有什么区别

它们都能操作浏览器，但走的路不太一样。

| 方案 | 核心思路 | 浏览器 | 代码迁移成本 | 我目前的理解 |
| --- | --- | --- | --- | --- |
| Playwright | 标准浏览器自动化 | Chromium / Firefox / WebKit | 基线 | 好用，但不负责隐藏自动化痕迹 |
| Camoufox | 修改 Firefox 内核，在 C++ / Juggler 层注入指纹并隐藏 Playwright 痕迹 | Firefox fork | 低，Python API 接近 Playwright | headless 指纹更完整，但要额外维护定制浏览器 |
| Patchright | 修改 Playwright Driver 和 Chromium 启动参数，修补 CDP 泄漏 | Chrome / Chromium | 很低，基本换 import | 适合保留现有 Playwright 代码，官方最佳实践偏向 headful Chrome |
| Nodriver | 不用 Selenium 和 ChromeDriver，直接使用 CDP 控制 Chrome | Chrome / Chromium | 中等，需要改成它自己的异步 API | 轻、直接，适合重新写一个小型采集器 |

还有几类方案这次没有展开实测：

- `undetected-chromedriver`：老牌 Selenium 路线，但 Nodriver 已经被作者定位成它的后继者。
- SeleniumBase UC Mode：如果项目本来就是 Selenium，可以少改一些代码。
- `puppeteer-extra-plugin-stealth` / `playwright-extra`：通过页面侧补丁隐藏已知特征，上手快，但本质上仍是跟检测规则玩猫鼠游戏。
- Browserbase、Browserless 一类远程浏览器服务：把浏览器、代理和运维交给第三方，省事，但不太符合我这个个人、本地优先的信息中心。

## 本地测试环境与方法

测试时间是 2026 年 8 月 31 日，环境如下：

```text
macOS 26.6.2 arm64
Python 3.13.14
Google Chrome 151.0.7922.174
Playwright 1.60.0
Patchright 1.62.2
Camoufox Python 0.5.5
Camoufox Browser 152.0.4-beta.28
Nodriver 0.50.3
```

四组都使用 headless 模式、同一台机器和同一个公网出口，每种方案只跑一次。测试内容包括：

1. 读取 UA、`navigator.webdriver`、语言、插件、屏幕、CPU、内存和 WebGL 等信息。
2. 打开 [Sannysoft Bot Test](https://bot.sannysoft.com/)。
3. 打开 [Incolumitas Bot Detection](https://bot.incolumitas.com/)。
4. 打开由 Cloudflare 托管的 [nowsecure.nl](https://www.nowsecure.nl/)。
5. 使用独立 profile 写入 Cookie 和 LocalStorage，关闭浏览器再启动，检查登录态数据能否恢复。

这不是成功率压测，也没有拿真实平台账号反复撞风控。单次公开检测只能说明本机当时暴露了哪些常见特征，不能外推到所有网站。

这套实验只讨论个人、低频、正常权限内的信息读取。平台明确禁止自动化、内容涉及隐私或需要绕过访问权限时，就不应该因为浏览器技术上能点开而继续抓。

## 原生 Playwright 的特征确实很直白

原生 Playwright 启动本机 Chrome 后，最显眼的是这两个值：

```text
User-Agent: ... HeadlessChrome/151.0.0.0 ...
navigator.webdriver: true
```

Sannysoft 的 8 个基础项目通过 6 个，失败的是 UA 和 WebDriver。Incolumitas 的两组检测合计出现 5 个 `FAIL`，包括 `HEADCHR_UA`、`WEBDRIVER` 和内存特征。

![原生 Playwright 在 Sannysoft 检测中暴露 HeadlessChrome UA 和 WebDriver](https://imgbed.szmckj.cn/uploads/2026/08/31/6a95849bea21a.png)

难怪会被拦，这基本等于进门先说了一句“我是自动化浏览器”。

## 四种 headless 方案的检测结果

| 方案 | `navigator.webdriver` | UA 是否包含 `HeadlessChrome` | Sannysoft | Incolumitas `FAIL` 数 | nowsecure.nl |
| --- | --- | --- | --- | --- | --- |
| Playwright | `true` | 是 | 6 通过 / 2 失败 | 5 | 200，可正常读取 |
| Patchright | `false` | 是 | 7 通过 / 1 失败 | 4 | 200，可正常读取 |
| Camoufox | `false` | 否 | 7 通过 / 1 失败 | 1 | 200，可正常读取 |
| Nodriver | `false` | 是 | 7 通过 / 1 失败 | 4 | 可正常读取 |

这里有两个地方不能只数红灯。

Camoufox 在 Sannysoft 唯一失败的是 `window.chrome` 不存在，但 Camoufox 本来就是 Firefox，不应该为了通过 Chromium 专属检查硬塞一个 `window.chrome`。反过来，它在 Incolumitas 的 `webDriverAdvanced` 上出现一个 `FAIL`，说明也不能把“底层修改”理解成绝对不可检测。

![Camoufox 在 Sannysoft 检测中隐藏 WebDriver，Firefox UA 不含 Headless 标记](https://imgbed.szmckj.cn/uploads/2026/08/31/6a95849c612a3.png)

Patchright 和 Nodriver 都成功把 `navigator.webdriver` 从 `true` 变成了 `false`，但在当前 headless 配置下，UA 仍写着 `HeadlessChrome`。Patchright 官方推荐的最佳实践其实是 `headless=False`、真实 Chrome、持久化 context，并明确建议不要手动乱改 UA 和请求头。这次为了同条件比较，没有给它单独开 headful 加分局。

`nowsecure.nl` 这一轮四种方案全部正常打开，因此没有形成区分度。它只能证明这个页面当时没有拦住它们，不能证明都通过了 Cloudflare 的所有检测。

## Camoufox 安装时先给了我一个 403

Python 包安装很顺利：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install camoufox
python -m camoufox fetch
```

结果 `fetch` 在同步 GitHub Releases 时失败了：

```text
403 Client Error: rate limit exceeded
Synced 0 versions from 0 repos.
Version 'official' not found in cache. Run 'camoufox sync'.
```

Camoufox 的 Python 包不包含浏览器本体，下载器还要去 GitHub Releases 找对应构建。当前出口碰到了匿名 API 限流。我最后从官方 Release 直接下载 macOS ARM64 资产才继续测试。

这次使用的 `152.0.4-beta.28` 压缩包约 304 MB，解压后浏览器目录约 639 MB。官方 Release 也明确提醒它仍在活跃开发，不一定适合生产环境。所以 Camoufox 的成本不只是一行 `pip install`，还包括定制内核的下载、版本匹配和后续更新。

## 对个人信息中心来说，固定 profile 比随机指纹更重要

我最初关注的是“怎么伪装得更像真人”，但个人信息中心和批量爬虫其实不是同一个需求。

我不是要同时制造一百个身份，而是希望同一个“我”隔一段时间回来看看更新。因此合理的做法应该是：

- 每个平台使用独立且长期固定的自动化 profile。
- 第一次登录时人工处理验证码、扫码或二次验证。
- 后续复用 Cookie、LocalStorage、IndexedDB 和站点权限。
- 尽量保持 IP、时区、语言、浏览器内核和屏幕信息稳定。
- 不要每次启动都随机成一台全新的电脑。

我在本地 HTTP 页面分别给 Patchright、Camoufox、Nodriver 的 profile 写入带过期时间的 Cookie 和 LocalStorage，关闭浏览器后重新启动。三者都恢复成功：

```json
{
  "localStorage": "alive",
  "cookie": "bench_cookie=alive"
}
```

Camoufox 可以直接使用持久化 context：

```python
from camoufox.sync_api import Camoufox

with Camoufox(
    headless=True,
    os="macos",
    persistent_context=True,
    user_data_dir="./profiles/example",
) as context:
    page = context.pages[0] if context.pages else context.new_page()
    page.goto("https://example.com")
```

Patchright 则基本沿用 Playwright 写法：

```python
from patchright.sync_api import sync_playwright

with sync_playwright() as playwright:
    context = playwright.chromium.launch_persistent_context(
        user_data_dir="./profiles/example",
        channel="chrome",
        headless=False,
        no_viewport=True,
    )
    page = context.pages[0]
    page.goto("https://example.com")
    context.close()
```

profile 里有真实 Cookie 和登录状态，不能提交到 Git，也不应该让不同任务同时占用同一个目录。Playwright 官方还提醒，不要直接拿日常使用的 Chrome 主 profile 做自动化；应该给自动化单独建目录。

## 我会怎么搭这个个人信息中心

浏览器不应该成为唯一采集入口。我现在更倾向于分层：

```text
定时调度
├── RSS / 公开 API
├── 普通 HTTP 抓取
├── 平台专用浏览器适配器
│   ├── 固定 profile
│   ├── 增量游标
│   └── 人工验证入口
└── 手动导入
        ↓
统一内容模型
        ↓
去重 / SQLite / 全文搜索 / 摘要
```

每个平台一个适配器，记录最后成功时间、最后一条内容 ID、连续失败次数和下一次允许重试时间。遇到 `429`、登录失效或验证码就停下来，交给人工处理，而不是一怒之下再并发重试几十次。

浏览器这一层，我目前会这样选：

- 已经有 Playwright 代码：先试 Patchright，迁移成本最低；能够接受可见浏览器时按官方 headful 配置跑。
- 新写 Python 小采集器，而且主要目标是 Chrome：可以试 Nodriver。
- headless 是硬需求，或者普通 Chromium 路线总被明显识别：把 Camoufox 作为更重的 Firefox 备选。
- 真实平台仍然拦截：先检查访问频率、账号状态、IP 和 profile 是否稳定，不要第一反应就是继续堆 stealth 补丁。

还有一个容易忽略的点：浏览器能打开页面，不代表适合立刻拦截所有请求、屏蔽脚本或接入中间人代理。Camoufox 的检测跟踪 Issue 里已经记录过 `page.route` 和 MITM 代理改变可见特征的情况。为了省一点图片流量，反而把整套网络指纹搞得更奇怪，挺亏的。

## 暂时结论

如果只看这次 headless 短测，Camoufox 的结果最好，而且不是靠在页面里覆盖几个 JavaScript 属性，而是从 Firefox 内核和自动化协议层处理指纹。这条路线确实有意思。

但要做我这个个人信息中心，我不会把全部希望压在“不可检测浏览器”上。更实际的组合是：**平台专用适配器 + 独立持久化 profile + 低频增量同步 + 失败退避 + 人工验证兜底**。Camoufox、Patchright 或 Nodriver只是浏览器适配器的不同实现。

检测和反检测一直在变，这篇记录只代表 2026 年 8 月 31 日这台 Mac 上的一次短测。之后真接入具体平台，再按平台逐个记录成功率和翻车点。

先这样，至少现在不是拿着原生 Playwright 的 `webdriver=true` 硬着头皮往里冲了。

## 参考

- [Camoufox 官方文档](https://camoufox.com/)
- [Camoufox GitHub 与 Releases](https://github.com/daijro/camoufox)
- [Patchright Python](https://github.com/Kaliiiiiiiiii-Vinyzu/patchright-python)
- [Patchright Driver](https://github.com/Kaliiiiiiiiii-Vinyzu/patchright)
- [Nodriver](https://github.com/ultrafunkamsterdam/nodriver)
- [Playwright persistent context 文档](https://playwright.dev/python/docs/api/class-browsertype#browser-type-launch-persistent-context)
- [Camoufox detection status tracking](https://github.com/daijro/camoufox/issues/686)
- [之前整理的浏览器指纹](/posts/什么是浏览器指纹/)
