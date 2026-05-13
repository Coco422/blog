# Claude Code 斜杠命令完整列表 - 调研草稿

> 调研日期: 2026-05-13
> 数据来源: code.claude.com/docs/en/commands, code.claude.com/docs/en/cli-reference, code.claude.com/docs/en/changelog

## 背景

Claude Code 于 **2025年2月** 以 "research preview" 形式首次发布，是 Anthropic 推出的终端 agentic 编码工具。

官方 changelog 从 **v2.1.94 (2026-04-07)** 开始有记录，更早的版本历史不完整。

## 当前版本: v2.1.140 (2026-05-12)

## 完整斜杠命令列表 (70个)

| # | 命令 | 类型 | 用途 | 文档链接 |
|---|------|------|------|----------|
| 1 | `/add-dir <path>` | 内置 | 添加工作目录，授权文件访问 | [docs](https://code.claude.com/docs/en/commands#add-dir) |
| 2 | `/agents` | 内置 | 管理 subagent 配置 | [docs](https://code.claude.com/docs/en/sub-agents) |
| 3 | `/autofix-pr [prompt]` | 内置 | 启动 web session 自动修复 PR 的 CI 失败和 review 评论 | [docs](https://code.claude.com/docs/en/claude-code-on-the-web#auto-fix-pull-requests) |
| 4 | `/background [prompt]` | 内置 | 将当前会话放到后台运行，释放终端。别名 `/bg` | [docs](https://code.claude.com/docs/en/agent-view) |
| 5 | `/batch <instruction>` | Skill | 大规模并行代码变更，拆分成独立单元分别在 worktree 中执行并开 PR | [docs](https://code.claude.com/docs/en/worktrees) |
| 6 | `/branch [name]` | 内置 | 在当前点创建会话分支。别名 `/fork` | [docs](https://code.claude.com/docs/en/commands) |
| 7 | `/btw <question>` | 内置 | 快速旁问，不污染会话历史 | [docs](https://code.claude.com/docs/en/interactive-mode#side-questions-with-%2Fbtw) |
| 8 | `/chrome` | 内置 | 配置 Chrome 浏览器集成 | [docs](https://code.claude.com/docs/en/chrome) |
| 9 | `/claude-api [migrate\|managed-agents-onboard]` | Skill | 加载 Claude API 参考资料，支持代码迁移和 Managed Agents 入门 | [docs](https://code.claude.com/docs/en/commands) |
| 10 | `/clear [name]` | 内置 | 清空上下文开始新会话。别名 `/reset`, `/new` | [docs](https://code.claude.com/docs/en/commands) |
| 11 | `/color [color\|default]` | 内置 | 设置当前会话的提示栏颜色 | [docs](https://code.claude.com/docs/en/commands) |
| 12 | `/compact [instructions]` | 内置 | 压缩对话上下文，释放 token 空间 | [docs](https://code.claude.com/docs/en/context-window) |
| 13 | `/config` | 内置 | 打开设置界面。别名 `/settings` | [docs](https://code.claude.com/docs/en/settings) |
| 14 | `/context [all]` | 内置 | 可视化当前上下文使用情况，彩色网格显示 | [docs](https://code.claude.com/docs/en/commands) |
| 15 | `/copy [N]` | 内置 | 复制最后一个回复到剪贴板，支持代码块选择 | [docs](https://code.claude.com/docs/en/commands) |
| 16 | `/cost` | 内置 | `/usage` 的别名 | [docs](https://code.claude.com/docs/en/commands) |
| 17 | `/debug [description]` | Skill | 启用调试日志并排查问题 | [docs](https://code.claude.com/docs/en/commands) |
| 18 | `/desktop` | 内置 | 在 Claude Desktop 应用中继续会话。macOS/Windows only。别名 `/app` | [docs](https://code.claude.com/docs/en/desktop) |
| 19 | `/diff` | 内置 | 打开交互式 diff 查看器，显示未提交更改和逐轮 diff | [docs](https://code.claude.com/docs/en/commands) |
| 20 | `/doctor` | 内置 | 诊断 Claude Code 安装和配置问题 | [docs](https://code.claude.com/docs/en/commands) |
| 21 | `/effort [level\|auto]` | 内置 | 设置模型努力等级 (low/medium/high/xhigh/max) | [docs](https://code.claude.com/docs/en/model-config#adjust-effort-level) |
| 22 | `/exit` | 内置 | 退出 CLI。别名 `/quit` | [docs](https://code.claude.com/docs/en/commands) |
| 23 | `/export [filename]` | 内置 | 导出当前对话为纯文本 | [docs](https://code.claude.com/docs/en/commands) |
| 24 | `/extra-usage` | 内置 | 配置 extra usage 以在触发速率限制时继续工作 | [docs](https://code.claude.com/docs/en/commands) |
| 25 | `/fast [on\|off]` | 内置 | 切换 fast mode | [docs](https://code.claude.com/docs/en/fast-mode) |
| 26 | `/feedback [report]` | 内置 | 提交反馈。别名 `/bug` | [docs](https://code.claude.com/docs/en/commands) |
| 27 | `/fewer-permission-prompts` | Skill | 扫描历史记录，添加常用只读操作的允许列表以减少权限提示 | [docs](https://code.claude.com/docs/en/commands) |
| 28 | `/focus` | 内置 | 切换焦点视图，只显示最后一个提示和回复 | [docs](https://code.claude.com/docs/en/fullscreen) |
| 29 | `/goal [condition\|clear]` | 内置 | 设置目标条件，Claude 会持续工作直到满足 | [docs](https://code.claude.com/docs/en/goal) |
| 30 | `/heapdump` | 内置 | 写入 JavaScript heap 快照，用于排查高内存使用 | [docs](https://code.claude.com/docs/en/troubleshooting#high-cpu-or-memory-usage) |
| 31 | `/help` | 内置 | 显示帮助和可用命令 | [docs](https://code.claude.com/docs/en/commands) |
| 32 | `/hooks` | 内置 | 查看 hook 配置 | [docs](https://code.claude.com/docs/en/hooks) |
| 33 | `/ide` | 内置 | 管理 IDE 集成并显示状态 | [docs](https://code.claude.com/docs/en/commands) |
| 34 | `/init` | 内置 | 初始化项目 CLAUDE.md 文件 | [docs](https://code.claude.com/docs/en/memory) |
| 35 | `/insights` | 内置 | 生成会话分析报告 | [docs](https://code.claude.com/docs/en/commands) |
| 36 | `/install-github-app` | 内置 | 安装 Claude GitHub Actions app | [docs](https://code.claude.com/docs/en/github-actions) |
| 37 | `/install-slack-app` | 内置 | 安装 Claude Slack app | [docs](https://code.claude.com/docs/en/slack) |
| 38 | `/keybindings` | 内置 | 打开或创建快捷键配置 | [docs](https://code.claude.com/docs/en/commands) |
| 39 | `/login` | 内置 | 登录 Anthropic 账户 | [docs](https://code.claude.com/docs/en/commands) |
| 40 | `/logout` | 内置 | 登出账户 | [docs](https://code.claude.com/docs/en/commands) |
| 41 | `/loop [interval] [prompt]` | Skill | 循环执行 prompt。别名 `/proactive` | [docs](https://code.claude.com/docs/en/scheduled-tasks) |
| 42 | `/mcp` | 内置 | 管理 MCP 服务器连接和 OAuth 认证 | [docs](https://code.claude.com/docs/en/mcp) |
| 43 | `/memory` | 内置 | 编辑 CLAUDE.md 记忆文件，管理 auto-memory | [docs](https://code.claude.com/docs/en/memory) |
| 44 | `/mobile` | 内置 | 显示下载 Claude 移动应用的 QR 码。别名 `/ios`, `/android` | [docs](https://code.claude.com/docs/en/commands) |
| 45 | `/model [model]` | 内置 | 选择或切换 AI 模型 | [docs](https://code.claude.com/docs/en/model-config) |
| 46 | `/passes` | 内置 | 分享免费 Claude Code 体验周 | [docs](https://code.claude.com/docs/en/commands) |
| 47 | `/permissions` | 内置 | 管理工具权限的允许/询问/拒绝规则。别名 `/allowed-tools` | [docs](https://code.claude.com/docs/en/settings) |
| 48 | `/plan [description]` | 内置 | 进入计划模式 | [docs](https://code.claude.com/docs/en/commands) |
| 49 | `/plugin` | 内置 | 管理 Claude Code 插件 | [docs](https://code.claude.com/docs/en/plugins) |
| 50 | `/powerup` | 内置 | 通过交互式课程发现 Claude Code 功能 | [docs](https://code.claude.com/docs/en/commands) |
| 51 | `/privacy-settings` | 内置 | 查看和更新隐私设置 (Pro/Max) | [docs](https://code.claude.com/docs/en/commands) |
| 52 | `/radio` | 内置 | 在浏览器打开 Claude FM lo-fi radio | [docs](https://code.claude.com/docs/en/commands) |
| 53 | `/recap` | 内置 | 生成当前会话摘要 | [docs](https://code.claude.com/docs/en/interactive-mode#session-recap) |
| 54 | `/release-notes` | 内置 | 查看更新日志，交互式版本选择器 | [docs](https://code.claude.com/docs/en/commands) |
| 55 | `/reload-plugins` | 内置 | 重新加载所有活跃插件 | [docs](https://code.claude.com/docs/en/plugins) |
| 56 | `/remote-control` | 内置 | 让当前会话可从 claude.ai 远程控制。别名 `/rc` | [docs](https://code.claude.com/docs/en/remote-control) |
| 57 | `/remote-env` | 内置 | 配置 web session 的默认远程环境 | [docs](https://code.claude.com/docs/en/claude-code-on-the-web) |
| 58 | `/rename [name]` | 内置 | 重命名当前会话 | [docs](https://code.claude.com/docs/en/commands) |
| 59 | `/resume [session]` | 内置 | 恢复之前的会话。别名 `/continue` | [docs](https://code.claude.com/docs/en/commands) |
| 60 | `/review [PR]` | 内置 | 在本地审查 PR | [docs](https://code.claude.com/docs/en/commands) |
| 61 | `/rewind` | 内置 | 回退对话和/或代码到之前的状态。别名 `/checkpoint`, `/undo` | [docs](https://code.claude.com/docs/en/checkpointing) |
| 62 | `/sandbox` | 内置 | 切换沙箱模式 | [docs](https://code.claude.com/docs/en/sandboxing) |
| 63 | `/schedule [description]` | 内置 | 创建/管理 routines（云端定时任务）。别名 `/routines` | [docs](https://code.claude.com/docs/en/routines) |
| 64 | `/scroll-speed` | 内置 | 调整鼠标滚轮速度 (fullscreen only) | [docs](https://code.claude.com/docs/en/fullscreen#mouse-wheel-scrolling) |
| 65 | `/security-review` | 内置 | 分析当前分支待提交更改的安全漏洞 | [docs](https://code.claude.com/docs/en/commands) |
| 66 | `/setup-bedrock` | 内置 | 配置 Amazon Bedrock 认证和模型 | [docs](https://code.claude.com/docs/en/amazon-bedrock) |
| 67 | `/setup-vertex` | 内置 | 配置 Google Vertex AI 认证和模型 | [docs](https://code.claude.com/docs/en/google-vertex-ai) |
| 68 | `/simplify [focus]` | Skill | 审查最近更改的文件，修复代码复用、质量和效率问题 | [docs](https://code.claude.com/docs/en/commands) |
| 69 | `/skills` | 内置 | 列出可用 skills | [docs](https://code.claude.com/docs/en/skills) |
| 70 | `/stats` | 内置 | `/usage` 的别名，打开 Stats 标签页 | [docs](https://code.claude.com/docs/en/commands) |
| 71 | `/status` | 内置 | 显示版本、模型、账户和连接状态 | [docs](https://code.claude.com/docs/en/commands) |
| 72 | `/statusline` | 内置 | 配置状态栏 | [docs](https://code.claude.com/docs/en/statusline) |
| 73 | `/stickers` | 内置 | 订购 Claude Code 贴纸 | [docs](https://code.claude.com/docs/en/commands) |
| 74 | `/stop` | 内置 | 停止当前后台会话 | [docs](https://code.claude.com/docs/en/agent-view) |
| 75 | `/tasks` | 内置 | 列出和管理后台任务。别名 `/bashes` | [docs](https://code.claude.com/docs/en/commands) |
| 76 | `/team-onboarding` | 内置 | 生成团队入门指南 | [docs](https://code.claude.com/docs/en/commands) |
| 77 | `/teleport` | 内置 | 将 web session 拉到本地终端。别名 `/tp` | [docs](https://code.claude.com/docs/en/claude-code-on-the-web#from-web-to-terminal) |
| 78 | `/terminal-setup` | 内置 | 配置终端快捷键 (Shift+Enter 等) | [docs](https://code.claude.com/docs/en/terminal-config) |
| 79 | `/theme` | 内置 | 切换配色主题 | [docs](https://code.claude.com/docs/en/terminal-config) |
| 80 | `/tui [default\|fullscreen]` | 内置 | 设置终端 UI 渲染器 | [docs](https://code.claude.com/docs/en/fullscreen) |
| 81 | `/ultraplan <prompt>` | 内置 | 在云端沙箱起草计划 | [docs](https://code.claude.com/docs/en/ultraplan) |
| 82 | `/ultrareview [PR]` | 内置 | 云端多 agent 深度代码审查 | [docs](https://code.claude.com/docs/en/ultrareview) |
| 83 | `/upgrade` | 内置 | 打开升级页面 | [docs](https://code.claude.com/docs/en/commands) |
| 84 | `/usage` | 内置 | 显示会话成本、计划用量和活动统计 | [docs](https://code.claude.com/docs/en/costs) |
| 85 | `/voice [hold\|tap\|off]` | 内置 | 切换语音输入 | [docs](https://code.claude.com/docs/en/voice-dictation) |
| 86 | `/web-setup` | 内置 | 将 GitHub 账户连接到 Claude Code on the web | [docs](https://code.claude.com/docs/en/web-quickstart) |

## 已移除的命令

| 命令 | 移除版本 | 说明 |
|------|----------|------|
| `/vim` | v2.1.92 | 改为通过 `/config` → Editor mode 切换 |
| `/pr-comments` | v2.1.91 | 改为直接让 Claude 查看 PR 评论 |

## 已知的别名汇总

| 主命令 | 别名 |
|--------|------|
| `/background` | `/bg` |
| `/branch` | `/fork` |
| `/clear` | `/reset`, `/new` |
| `/config` | `/settings` |
| `/cost` | `/usage` 的别名 |
| `/desktop` | `/app` |
| `/exit` | `/quit` |
| `/feedback` | `/bug` |
| `/loop` | `/proactive` |
| `/mobile` | `/ios`, `/android` |
| `/permissions` | `/allowed-tools` |
| `/remote-control` | `/rc` |
| `/rename` | - (无别名) |
| `/resume` | `/continue` |
| `/rewind` | `/checkpoint`, `/undo` |
| `/schedule` | `/routines` |
| `/stats` | `/usage` 的别名 |
| `/tasks` | `/bashes` |
| `/teleport` | `/tp` |

## 按功能分类

### 会话管理
- `/clear`, `/compact`, `/resume`, `/branch`, `/rewind`, `/rename`, `/export`, `/recap`, `/exit`

### 模型与推理
- `/model`, `/effort`, `/fast`

### 项目初始化与配置
- `/init`, `/config`, `/memory`, `/hooks`, `/permissions`, `/keybindings`, `/terminal-setup`, `/theme`, `/statusline`, `/tui`, `/scroll-speed`, `/color`

### 代码审查与安全
- `/review`, `/security-review`, `/ultrareview`, `/simplify`, `/diff`

### 并行工作与 Agents
- `/agents`, `/background`, `/batch`, `/tasks`, `/stop`, `/loop`, `/goal`, `/plan`

### 远程与跨设备
- `/remote-control`, `/teleport`, `/desktop`, `/autofix-pr`, `/remote-env`

### 云端能力
- `/schedule`, `/ultraplan`, `/ultrareview`

### 集成 (MCP/IDE/平台)
- `/mcp`, `/ide`, `/chrome`, `/install-github-app`, `/install-slack-app`, `/web-setup`, `/setup-bedrock`, `/setup-vertex`, `/plugin`, `/reload-plugins`

### 诊断与反馈
- `/doctor`, `/debug`, `/heapdump`, `/feedback`, `/usage`, `/extra-usage`

### 账户与订阅
- `/login`, `/logout`, `/upgrade`, `/privacy-settings`, `/passes`

### Skills (内置)
- `/batch`, `/claude-api`, `/debug`, `/fewer-permission-prompts`, `/loop`, `/simplify`

### 其他
- `/help`, `/status`, `/skills`, `/sandbox`, `/voice`, `/btw`, `/context`, `/copy`, `/focus`, `/insights`, `/add-dir`, `/team-onboarding`, `/powerup`, `/stickers`, `/radio`, `/mobile`, `/release-notes`

## 更新时间线 (已知)

| 日期 | 版本 | 新增/变更命令 |
|------|------|---------------|
| 2025-02 | research preview | 首次发布，包含基础命令 (/help, /clear, /compact, /config, /model 等) |
| 2026-04-07 | 2.1.94 | (effort defaults, plugin improvements) |
| 2026-04-08 | 2.1.97 | Ctrl+O focus view toggle |
| 2026-04-10 | 2.1.101 | `/team-onboarding` |
| 2026-04-13 | 2.1.105 | `/proactive` (别名 for `/loop`) |
| 2026-04-14 | 2.1.108 | `/recap`, `/undo` (别名 for `/rewind`) |
| 2026-04-15 | 2.1.110 | `/tui`, `/focus` |
| 2026-04-16 | 2.1.111 | `/fewer-permission-prompts`, `/ultrareview`, `/effort` 交互滑块 |
| 2026-04-23 | 2.1.118 | `/usage` (合并 /cost + /stats), 自定义主题 |
| 2026-04-28 | 2.1.120 | `claude ultrareview` 非交互子命令 |
| 2026-05-01 | 2.1.126 | `claude project purge` |
| 2026-05-04 | 2.1.128 | `/color` 增强 (随机色) |
| 2026-05-11 | 2.1.139 | `claude agents`, `/goal`, `/scroll-speed` |

> 注: 2025年2月到2026年4月之间的版本发布记录不完整（官方 changelog 从 v2.1.94 开始），很多命令的首次上线时间无法确认。

## 参考链接

- 官方命令文档: https://code.claude.com/docs/en/commands
- CLI 参考: https://code.claude.com/docs/en/cli-reference
- 交互模式: https://code.claude.com/docs/en/interactive-mode
- 更新日志: https://code.claude.com/docs/en/changelog
- Skills 文档: https://code.claude.com/docs/en/skills
- MCP 文档: https://code.claude.com/docs/en/mcp
