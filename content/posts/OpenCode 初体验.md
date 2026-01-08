---
title: OpenCode 初体验
description: OpenCode 初体验
date: 2026-01-09T00:32:49+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: true
lastmod: 2026-01-09T00:51:08+08:00
showLastMod: true
tags:
  - vibe-coding
categories:
  - 杂技浅尝
---
> [我是如何爽用OpenCode的 - 开发调优 - LINUX DO](https://linux.do/t/topic/1404993)
> 
> OpenCode 确实听说有一段时间，但是由于手头 codex+claudecode 以及cursor 三个工具配合使用对我而言vibe coding的体验已经算是不错的了。gemini3 出世以来 虽说强，但是没用过gemini cli，antigravity使用体感不佳（也许是用的太早了？）至少觉得简中交互不佳。
> 
> 那受佬友这篇文章的启发，怎么说我也要尝尝咸淡。

## 什么是OpenCode

[GitHub - anomalyco/opencode: The open source coding agent.](https://github.com/anomalyco/opencode)

The open source coding agent.

感谢开源贡献者。

## 怎么用

我的开发工具是 家中的windows+wsl 和公司的mac

写本文时在家里，那么就在vscode+wsl 里面实践一下

官方的安装方式

```
# YOLO
curl -fsSL https://opencode.ai/install | bash

# Package managers
npm i -g opencode-ai@latest        # or bun/pnpm/yarn
scoop bucket add extras; scoop install extras/opencode  # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS and Linux (recommended, always up to date)
brew install opencode              # macOS and Linux (official brew formula, updated less frequently)
paru -S opencode-bin               # Arch Linux
mise use -g opencode               # Any OS
nix run nixpkgs#opencode           # or github:anomalyco/opencode for latest dev branch
```

Vscode插件市场可以直接找到Opencode 的插件，安装一下，(ok 我以为这个就是完全体，原来只是个类似之前的 cc for vscode一样的东西)
那还是执行 `curl -fsSL https://opencode.ai/install | bash`，在点击运行。

![image.png](https://imgbed.anluoying.com/2026/01/db09dae0d98c1ac6efd5d5354a52b4d5.png)

> 嘶，没看到哪里有配置的入口，我一发消息就能用了，啊这？

但是几个亮点用的时候就震惊到我了。这个TUI可以和鼠标交互的含金量让我感到爽！点击一条message的时候 居然可以进行 revert、copy、fork，惊呼了要。先研究一下怎么配置模型。

![image.png](https://imgbed.anluoying.com/2026/01/093a1b59c12b1b73806db035cb343bb5.png)

ok，[Intro \| OpenCode](https://opencode.ai/docs#configure)
文档写着运行 `/connect` 命令来选择 Provider，那么可以看到其实刚刚应该是OpenCode给我提供了一个 free model ”big-pickle“

## 配置更多”懒人包“ 和各种小技巧

