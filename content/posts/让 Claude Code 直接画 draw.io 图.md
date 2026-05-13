---
title: 让 Claude Code 直接画 draw.io 图
description: 本地 drawio skill 验证和使用记录，顺便区分一下它和官方 drawio-mcp 的几种玩法
date: 2026-05-13T18:20:01+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-05-13T18:53:03+08:00
showLastMod: true
tags:
  - draw.io
  - Claude Code
  - MCP
  - AI绘图
categories:
  - 杂技浅尝
---

> 昨天看到一篇 drawio-mcp 的文章，说 draw.io 官方开源了 MCP，可以让 AI 直接生成可编辑架构图。

真是天赐的礼物

目前我画图基本都是用 processon这个平台，因为他在线编辑，所以等于一次编辑，导出修改查看。但是可惜的是这种肯定是要收费的，所以一直想找个替代版，另外还有一个问题是，让 LLM 输出 ASCII 字符画的话 很难进行拖动框框和一些 线路的修改。

看了一眼，mcp [GitHub - jgraph/drawio-mcp · GitHub](https://github.com/jgraph/drawio-mcp)，我似乎没有太多的 在线浏览之类的需求，首先我之前没怎么用过 drawio，我只有一个大概的概念。我找了一下他有 desktop 版本的，于是我下载了他的 desktop。然后仓库里面其实有一个 skills：[drawio-mcp/skill-cli/drawio/SKILL.md at main · jgraph/drawio-mcp · GitHub](https://github.com/jgraph/drawio-mcp/blob/main/skill-cli/drawio/SKILL.md) 你可以直接叫 codex 或者 claude code去安装这个 skills

这个 `drawio` skill，本质上就是一份 Agent 指令。它会让 Claude Code 直接生成原生 `.drawio` 文件，也就是 draw.io 自己用的 `mxGraphModel` XML。

这点很关键。它不是先写 Mermaid，然后丢给某个服务转换；也不是生成一张死图。它写出来的就是 draw.io 能继续编辑的源文件。

用法也很直接，在 Claude Code 里喊 `/drawio` 就行：

```text
/drawio create a flowchart for user login
/drawio sequence diagram for API auth
/drawio ER diagram for blog posts and tags
```

如果不指定格式，它就生成 `.drawio` 文件，然后尝试打开 draw.io。

比如：

```text
/drawio create an architecture diagram for this Hugo blog deployment
```

最后应该会得到类似这种文件：

```text
hugo-blog-deployment.drawio
```

如果想直接要图片，也可以在 prompt 里指定格式：

```text
/drawio png flowchart for user login
/drawio svg ER diagram for e-commerce
/drawio pdf architecture overview
```

这个时候它会尝试找 draw.io Desktop 自带的 CLI，然后执行类似这样的导出命令：

```bash
drawio -x -f png -e -b 10 -o diagram.drawio.png diagram.drawio
```

这里最重要的是 `-e`，也就是 `--embed-diagram`。导出的 PNG / SVG / PDF 里面会嵌入原始 XML，所以这些文件不是普通截图，拖回 draw.io 里还能继续编辑。

这个设计挺香的。

> 这就像是把图纸和渲染图塞进了同一个文件里。平时发出去别人看到的是图片，真要改的时候还能把图纸掏出来继续施工。

不过前提是本机得有 draw.io Desktop。macOS 下默认路径是：

```bash
/Applications/draw.io.app/Contents/MacOS/draw.io
```

Linux 一般看 `drawio` 在不在 PATH 里。WSL2 稍微麻烦点，要去 Windows 那边找：

```bash
`/mnt/c/Program Files/draw.io/draw.io.exe`
```

注意这个反引号不是装饰，是为了处理 `Program Files` 里的空格。这个设计看着有点怪，但 skill 里就是这么写的。

如果找不到 draw.io CLI，也不是完全不能用。它会保留 `.drawio` 文件，然后我再自己用 draw.io 打开。也就是说，导出图片失败不影响生成源文件。

说到官方 drawio-mcp，它其实不止这一种玩法。

我参考了一下之前整理的那篇文章，官方仓库里大概可以分成这几类：

| 方式 | 适合什么 | 大概是什么感觉 |
|---|---|---|
| Skill + CLI | 在代码仓库里产出图文件 | 本地写 `.drawio`，可提交、可版本管理 |
| MCP Tool Server | 临时把图打开到 draw.io 编辑器 | `npx @drawio/mcp` 起一个本地 MCP server |
| MCP App Server | 支持 MCP Apps 的聊天界面 | 在聊天里直接预览/交互 |
| Project Instructions | 临时试一下 | 不安装，复制 prompt 规则硬上 |

我现在更喜欢 Skill + CLI 这套。

原因很简单：它的产物明确。

生成出来就是文件，放进仓库就完事。博客里要图、项目文档里要图、README 里要图，都适合这种方式。临时看一眼图的话，MCP Tool Server 可能更顺手；但如果我想让这个图以后还能被找到、被 git 追踪，那还是本地 `.drawio` 文件比较安心。

还有一个区别是格式支持。

MCP Tool Server 那边可以打开 XML / CSV / Mermaid。也就是说你可以让它把 Mermaid 送进 draw.io 编辑器里。

但这个 skill 明确要求直接生成 XML，不走 Mermaid/CSV 转换。看起来少了点自由度，但好处也明显：落地就是原生 draw.io 文件，不依赖服务端转换，不绕一圈。

简单让他画了一个架构图，回头测一个复杂架构

![image.png](https://imgbed.anluoying.com/2026/05/69a54c792556035574be0a26a7a391cf.png)


---

ok，复杂结构测试效果如下

![image.png](https://imgbed.anluoying.com/2026/05/2e4c8167e526279a56214dddd21ba625.png)

丑了点，但是逻辑还是可以的，整体来讲 做一个可迭代的架构图是没问题了，而且 drawio 的特性保存文件在本地，也很有安全感