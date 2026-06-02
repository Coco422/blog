---
title: code graph浅尝
description: 本文实测codegraph工具，记录其利用Tree-sitter解析源码、构建本地代码知识图谱并存入SQLite的流程。涵盖安装初始化及通过MCP接入Claude Code的步骤，并分享初步体验。
date: 2026-06-02T14:46:41+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-06-02T15:24:10+08:00
showLastMod: true
tags:
  - AI
  - AI编程
  - MCP
categories:
  - 杂技浅尝
---
> 看到个项目，code graph，顾名思义应该是把项目代码给构建成图谱，拖延到今天来实测一下效果

仓库地址：[GitHub - colbymchenry/codegraph: Pre-indexed code knowledge graph for Claude Code, Codex, Gemini, Cursor, OpenCode, AntiGravity, Kiro, and Hermes Agent — fewer tokens, fewer tool calls, 100% local · GitHub](https://github.com/colbymchenry/codegraph)

## 安装 code graph

mac 安装命令
```zsh
curl -fsSL https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.sh | sh
```

![image.png|300](https://imgbed.anluoying.com/2026/06/9a72a059bebe62222b1b0e1311d9b527.png)
## 安装 MCP 配置

![image.png|300](https://imgbed.anluoying.com/2026/06/55540450efc31d2700dc723f243ff3bd.png)

## 初始化项目

进入一个最近在开发的目录，开始索引

```
cd your-project
codegraph init -i
```

接下来他会扫描仓库的文件并且在本地新建数据库 大概流程是这样的：
```
你的代码目录
     │
     ▼
Tree-sitter 解析源码
     │
     ▼
抽取符号(Symbol)
函数、类、方法、变量、路由
     │
     ▼
分析关系(Edge)
调用关系
继承关系
导入关系
引用关系
     │
     ▼
写入 SQLite
     │
     ▼
生成 .codegraph/
```

官方文档里提到，CodeGraph 会把符号、调用图、文件结构等信息存到 SQLite（FTS5）数据库中，并把项目数据放在 .codegraph/ 目录下。

![image.png|300](https://imgbed.anluoying.com/2026/06/8dd32b7c3691582ba2ac2cdd38678874.png)

codegraph 以 mcp 形式接入，我这里先拿 Claude code 试试

![image.png|300](https://imgbed.anluoying.com/2026/06/12891fd9aa5770d22d8f77646ddd80d5.png)
![image.png|300](https://imgbed.anluoying.com/2026/06/f4b3cb973f42ed38004660517cad876a.png)

简单尝试目前还看不出很明显的差距，本项目有一些本地记忆处于Claude 配置里面 所以也许会有干扰，但是按照他的设计理论来讲是有帮助的，我也看了一些网友的使用案例所以相信这一点。

我将接着使用这个 MCP 进行开发