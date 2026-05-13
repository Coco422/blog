---
title: Claude Code 斜杠命令大全
description: Claude Code 到目前为止所有斜杠命令的完整整理，附用法说明和参考链接，长期更新
date: 2026-05-13T13:00:00+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-05-13T13:00:00+08:00
showLastMod: true
tags:
  - Claude Code
  - AI编程
  - CLI
  - Anthropic
  - slash commands
categories:
  - 他山拾影
  - 杂技浅尝
---

> 这是一篇**长期更新**的博客。只要我还在用 Claude Code，或者 Claude Code 还在更新，这篇就会跟着更新。哪天我不用了或者 CC 停更了，会在标题加个 `[已停更]`。如果对你有用，欢迎留言催更。

---

用 Claude Code (下文简称 CC) 有段时间了。它最让我觉得舒服的一点是，进了交互会话之后，输入 `/` 就能看到一堆斜杠命令，该干嘛一目了然。

但我一直有个困扰——命令越来越多，有些是后来加的，有些改了名字，有些直接被删了。光靠 `/help` 的列表已经不够用了，我想有个完整的地方能看到"到底有多少个命令，每个干嘛用的"。

官方文档其实整理得不错，但散落在好几个页面里。我决定自己手动过一遍，把所有斜杠命令都扒下来，记录用法，贴上参考链接。

> 调研日期: 2026-05-13，CC 版本 v2.1.140。数据来源主要是 [官方 Commands 文档](https://code.claude.com/docs/en/commands)、[CLI Reference](https://code.claude.com/docs/en/cli-reference) 和 [Changelog](https://code.claude.com/docs/en/changelog)。

## 一点点点背景

Claude Code 是 Anthropic 在 **2025年2月** 以 "research preview" 形式发布的终端 AI 编码工具。简单说就是一个跑在终端里的 AI agent，能读你的代码、改文件、跑命令、操作 git，你用自然语言跟它说就行。

它一直在快速迭代。让 cc 查了一下官方 changelog，发现最早的记录只到 v2.1.94 (2026-04-07)，再往前的版本历史已经查不到了。所以很多命令具体是哪个版本加进来的，我没法给出确切时间。如果你知道，欢迎留言补充。

## 当前总览

截至 v2.1.140 (2026-05-12)，CC 的交互会话里一共有 **70个** 斜杠命令（算上别名的话是 86 个条目）。这个数字不含你自己写的 custom skills，也不含 MCP server 暴露出来的命令。

数量确实不少了。我按功能分了几个大类来整理，方便查找。

> 所有命令的详细文档入口: [code.claude.com/docs/en/commands](https://code.claude.com/docs/en/commands)

---

## 会话管理

这类命令管的是"对话"本身——开始、继续、压缩、分支、回退。

| 命令 | 用途 |
|------|------|
| `/clear [name]` | 清空上下文开始新会话。之前的历史还在 `/resume` 里。别名: `/reset`, `/new` |
| `/compact [instructions]` | 压缩对话上下文，释放 token 空间。对话太长的时候救命用的 |
| `/resume [session]` | 恢复之前的会话，可以按 ID 或名字。别名: `/continue` |
| `/branch [name]` | 在当前对话点创建一个分支，原对话保留。别名: `/fork` |
| `/rewind` | 回退对话和/或代码到之前某个点。别名: `/checkpoint`, `/undo` |
| `/rename [name]` | 给当前会话改名 |
| `/export [filename]` | 把对话导出成纯文本文件 |
| `/recap` | 生成当前会话的一句话摘要，离开一会儿回来用 |
| `/btw <question>` | 快速旁问，不进对话历史。上下文够用但不占位置，问完即走 |
| `/exit` | 退出。别名: `/quit` |

## 模型与推理

| 命令 | 用途 |
|------|------|
| `/model [model]` | 切换模型，比如 sonnet、opus |
| `/effort [level\|auto]` | 调努力等级: low / medium / high / xhigh / max。不加参数会出个滑块让你选 |
| `/fast [on\|off]` | 切换 fast mode，用更快的输出速度跑（不降级模型） |

## 项目初始化与配置

第一次在某个 repo 里用 CC，或者想调整配置，用这些。

| 命令 | 用途 |
|------|------|
| `/init` | 初始化项目的 CLAUDE.md，CC 的"项目记忆"入口 |
| `/config` | 打开设置界面，主题、模型、输出风格都在这调。别名: `/settings` |
| `/memory` | 编辑 CLAUDE.md 记忆文件，管理 auto-memory |
| `/hooks` | 查看 hook 配置（在工具调用前后执行 shell 命令） |
| `/permissions` | 管理工具权限规则: allow / ask / deny。别名: `/allowed-tools` |
| `/keybindings` | 打开或创建快捷键配置 |
| `/terminal-setup` | 配置终端快捷键，比如 Shift+Enter 换行（VS Code 等终端需要手动配） |
| `/theme` | 切换配色主题，支持 auto、亮色/暗色、色障友好、ANSI、自定义主题 |
| `/tui [default\|fullscreen]` | 设置终端渲染器。fullscreen 是无闪烁的 alt-screen 渲染 |
| `/statusline` | 配置状态栏显示内容 |
| `/scroll-speed` | 调鼠标滚轮速度（仅 fullscreen 模式） |
| `/color [color\|default]` | 设提示栏颜色。不加参数随机一个颜色 |
| `/sandbox` | 切换沙箱模式 |
| `/add-dir <path>` | 添加额外工作目录，授权文件访问 |

## 代码审查与安全

| 命令 | 用途 |
|------|------|
| `/review [PR]` | 本地审查 PR |
| `/security-review` | 分析当前分支待提交更改的安全漏洞 |
| `/ultrareview [PR]` | 云端多 agent 深度代码审查，比 `/review` 更重 |
| `/simplify [focus]` | 审查最近改过的文件，找代码复用、质量和效率问题并修复 |
| `/diff` | 打开交互式 diff 查看器，看未提交更改和逐轮 diff |

## 并行工作与 Agents

CC 能同时跑多个 agent，这部分命令管的就是这些。

| 命令 | 用途 |
|------|------|
| `/agents` | 管理 subagent 配置 |
| `/background [prompt]` | 把当前会话丢到后台跑，终端空出来干别的。别名: `/bg` |
| `/batch <instruction>` | 大规模并行变更。CC 拆成 5~30 个独立单元，每个跑在自己的 worktree 里，各自开 PR |
| `/tasks` | 列出和管理后台任务。别名: `/bashes` |
| `/stop` | 停止当前后台会话 |
| `/loop [interval] [prompt]` | 循环执行 prompt，可以指定间隔。不加间隔就 CC 自己控节奏。别名: `/proactive` |
| `/goal [condition\|clear]` | 设个目标条件，CC 会持续跨轮工作直到满足 |
| `/plan [description]` | 进入计划模式，先规划再动手 |

## 远程与跨设备

CC 的会话不绑定一个终端，可以在设备间切换。

| 命令 | 用途 |
|------|------|
| `/remote-control` | 让当前会话可从 claude.ai 或 Claude app 远程控制。别名: `/rc` |
| `/teleport` | 把 web session 拉到本地终端继续。别名: `/tp` |
| `/desktop` | 在 Claude Desktop 应用里继续当前会话。macOS/Windows only。别名: `/app` |
| `/autofix-pr [prompt]` | 启动 web session 监控当前分支的 PR，CI 失败或 review 评论时自动修复 |
| `/remote-env` | 配置 web session 的默认远程环境 |

## 云端能力

CC 有些功能是跑在 Anthropic 的云上的。

| 命令 | 用途 |
|------|------|
| `/schedule [description]` | 创建/管理 routines，云端定时任务。别名: `/routines` |
| `/ultraplan <prompt>` | 云端沙箱里起草计划，浏览器里 review 后执行或发回终端 |
| `/ultrareview [PR]` | (同上，也归这里) 云端多 agent 审查 |

## 集成 (MCP / IDE / 平台)

| 命令 | 用途 |
|------|------|
| `/mcp` | 管理 MCP 服务器连接和 OAuth 认证 |
| `/ide` | 管理 IDE 集成并显示状态 |
| `/chrome` | 配置 Chrome 浏览器集成 |
| `/install-github-app` | 安装 Claude GitHub Actions app |
| `/install-slack-app` | 安装 Claude Slack app |
| `/web-setup` | 把 GitHub 账户连接到 Claude Code on the web |
| `/setup-bedrock` | 配置 Amazon Bedrock 认证和模型 |
| `/setup-vertex` | 配置 Google Vertex AI 认证和模型 |
| `/plugin` | 管理 Claude Code 插件 |
| `/reload-plugins` | 重新加载所有活跃插件 |

## 诊断与反馈

| 命令 | 用途 |
|------|------|
| `/doctor` | 诊断安装和配置问题，按 `f` 让 CC 自动修 |
| `/debug [description]` | 开启调试日志，排查问题用 |
| `/heapdump` | 写 JS heap 快照，排查内存问题 |
| `/feedback [report]` | 提交反馈。别名: `/bug` |
| `/usage` | 显示会话成本、计划用量和活动统计。别名: `/cost`, `/stats` |
| `/extra-usage` | 配置 extra usage 以突破速率限制 |
| `/release-notes` | 查看更新日志，交互式版本选择器 |
| `/insights` | 生成会话分析报告，包括项目区域、交互模式、摩擦点 |

## 账户与订阅

| 命令 | 用途 |
|------|------|
| `/login` | 登录 Anthropic 账户 |
| `/logout` | 登出 |
| `/upgrade` | 打开升级页面 |
| `/privacy-settings` | 查看和更新隐私设置 (Pro/Max) |
| `/passes` | 分享免费体验周给朋友 |

## 内置 Skills

这些是 CC 自带的 skill，用的是和你自己写的 skill 一样的机制——本质上是一个 prompt 交给 CC 执行。

| 命令 | 用途 |
|------|------|
| `/batch` | 大规模并行变更（上面说过了） |
| `/claude-api` | 加载 Claude API 参考资料，支持代码迁移 |
| `/debug` | 调试日志排查（上面说过了） |
| `/fewer-permission-prompts` | 扫描历史记录，添加常用只读操作的允许列表 |
| `/loop` | 循环执行（上面说过了） |
| `/simplify` | 代码质量审查（上面说过了） |

查看所有可用 skills: `/skills`

## 其他

零零碎碎归不到上面类别的：

| 命令 | 用途 |
|------|------|
| `/help` | 显示帮助 |
| `/status` | 版本、模型、账户、连接状态 |
| `/context [all]` | 可视化上下文使用情况，彩色网格 |
| `/copy [N]` | 复制最后一个回复到剪贴板。`/copy 2` 复制倒数第二个 |
| `/focus` | 切换焦点视图，只显示最后一个 prompt 和回复 |
| `/skills` | 列出可用 skills |
| `/powerup` | 交互式功能课程，带动画演示 |
| `/team-onboarding` | 从你的 CC 使用历史生成团队入门指南 |
| `/voice [hold\|tap\|off]` | 语音输入 |
| `/mobile` | 显示下载 Claude 移动应用的 QR 码。别名: `/ios`, `/android` |
| `/stickers` | 订购 CC 贴纸 [Doge] |
| `/radio` | 浏览器打开 Claude FM lo-fi radio |

## 已被移除的命令

| 命令 | 移除版本 | 去哪了 |
|------|----------|--------|
| `/vim` | v2.1.92 | 改为 `/config` → Editor mode |
| `/pr-comments` | v2.1.91 | 改为直接让 Claude 查看 PR 评论 |

## 别名速查

有些命令有多个名字，怕你用混了，列一下：

| 主命令 | 别名 |
|--------|------|
| `/background` | `/bg` |
| `/branch` | `/fork` |
| `/clear` | `/reset`, `/new` |
| `/config` | `/settings` |
| `/cost` → `/usage` | `/stats` |
| `/desktop` | `/app` |
| `/exit` | `/quit` |
| `/feedback` | `/bug` |
| `/loop` | `/proactive` |
| `/mobile` | `/ios`, `/android` |
| `/permissions` | `/allowed-tools` |
| `/remote-control` | `/rc` |
| `/resume` | `/continue` |
| `/rewind` | `/checkpoint`, `/undo` |
| `/schedule` | `/routines` |
| `/tasks` | `/bashes` |
| `/teleport` | `/tp` |

## 更新时间线

能查到的版本发布时间线。CC 在 2025 年 2 月首次发布，但官方 changelog 从 v2.1.94 (2026-04-07) 才有记录，中间有一大段空白。如果你知道更早版本的信息，留言告诉我。

| 日期 | 版本 | 关键变更 |
|------|------|----------|
| 2025-02 | research preview | CC 首次发布，包含基础命令 |
| 2026-04-07 | 2.1.94 | changelog 可追溯的最早版本 |
| 2026-04-10 | 2.1.101 | 新增 `/team-onboarding` |
| 2026-04-13 | 2.1.105 | 新增 `/proactive` (别名 for `/loop`) |
| 2026-04-14 | 2.1.108 | 新增 `/recap`, `/undo` |
| 2026-04-15 | 2.1.110 | 新增 `/tui`, `/focus` |
| 2026-04-16 | 2.1.111 | 新增 `/fewer-permission-prompts`, `/ultrareview` |
| 2026-04-23 | 2.1.118 | `/usage` 合并了 `/cost` 和 `/stats` |
| 2026-05-04 | 2.1.128 | `/color` 增强 |
| 2026-05-11 | 2.1.139 | 新增 `/goal`, `/scroll-speed` |

## 参考链接

- [Commands 完整文档](https://code.claude.com/docs/en/commands) — 最权威的命令列表
- [CLI Reference](https://code.claude.com/docs/en/cli-reference) — 启动参数和 CLI 子命令
- [Interactive Mode](https://code.claude.com/docs/en/interactive-mode) — 键盘快捷键、Vim 模式、命令历史
- [Skills](https://code.claude.com/docs/en/skills) — 自定义技能
- [Changelog](https://code.claude.com/docs/en/changelog) — 官方更新日志
- [MCP](https://code.claude.com/docs/en/mcp) — Model Context Protocol 文档
- [Settings](https://code.claude.com/docs/en/settings) — 配置选项

---

> 这篇会随着 CC 更新持续维护。命令多了少了改名了，我都会跟着更新。最新的 CC 版本号和本文最后更新时间在 frontmatter 的 `lastmod` 里。大家有发现什么遗漏或者错误，直接留言就好。
