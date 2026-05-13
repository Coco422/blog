---
title: 用 RTK 给 Claude Code 省点 token
description: RTK 是一个 Rust 写的 CLI 代理，能在 AI 编程助手执行 shell 命令时过滤压缩输出，省下 60-90% 的 token 消耗
date: 2026-05-13T15:54:40+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-05-13T16:01:50+08:00
showLastMod: true
tags:
  - Claude Code
  - RTK
  - AI 编程
  - Token 优化
categories:
  - 杂技浅尝
---

Token 已成为新型货币！！！

那么省钱是第一要素，这里介绍一个好玩的东西：RTK（Rust Token Killer）

说能省 60-90% 的 token。是不是吹，试试就知道

## RTK 是什么

简单说，RTK 是一个 CLI 代理，用 Rust 写的单文件二进制，零依赖。它做的事情就是卡在 AI 编程助手和 shell 命令之间，把命令的输出压缩过滤之后再返回给 AI。

举个例子，你让 Claude Code 跑一个 `git status`，正常情况下它会拿到完整的输出——每个文件的路径、状态、分支信息，全都一股脑塞进去，可能得 2000 个 token。但经过 RTK 过滤之后，真正有用的信息被提取出来，没用的噪音被砍掉，可能就 200 个 token 搞定了。

> 这就好比你朋友问你"今天中午吃了啥"，你不用把整个食堂菜单念一遍，直接说"黄焖鸡"就行了。

看一下这个原理图就明白了：

![image.png](https://imgbed.anluoying.com/2026/05/0871f4fc957319ced56a2e6ea237dfea.png)


它支持四种压缩策略：智能过滤（去掉注释、空行这些噪音）、分组聚合（把同类文件按目录归拢）、截断保留（只留关键上下文）、去重折叠（重复的日志行显示为计数）。

## 怎么使用

安装方式挺多的，Homebrew、cargo、curl 脚本、直接下二进制都行：

```bash
# Homebrew
brew install rtk

# 或者一键脚本
curl -fsSL https://rtk-ai.dev/install.sh | bash

# 或者 cargo（注意要用 git 源，crates.io 上有个同名的 Rust Type Kit 别装错了）
cargo install --git https://github.com/rtk-ai/rtk
```

装完跑一下 `rtk --version` 确认没问题。

然后关键一步——初始化：

```bash
rtk init
```

这个命令会自动帮你配好 Claude Code 的 hook。配完之后，以后 Claude Code 在 bash 里执行的命令，都会自动被 RTK 拦截重写，`git status` 会变成 `rtk git status`，完全透明，不用手动改任何东西。

## 支持的命令

RTK 支持的命令非常多，100 多个，基本上日常开发用到的都覆盖了：

- **Git 系列**：`git status`、`git log`、`git diff`、`git commit`、`git push` 这些是最常用的，省 token 效果也最明显。比如 `git commit` 只返回一个 `ok abc1234`，`git push` 只返回 `ok main`——AI 不需要看完整的 push 日志，知道成功了、推到哪个分支就行了
- **文件操作**：`ls`、`read`、`find`、`grep`、`diff`，都能压缩输出
- **测试跑器**：Jest、Vitest、pytest、go test、cargo test 都支持，而且特别暴力——失败的测试只显示失败的部分，成功的直接跳过，能省 90%
- **构建和 lint**：eslint、tsc、prettier、cargo clippy、ruff 这些也能过滤
- **包管理器**：pnpm、pip、cargo 的安装输出也会被压缩
- **AWS CLI**：这个我没用过，但看文档支持得挺全的，EC2、Lambda、CloudWatch、S3 都能过滤
- **Docker / k8s**：`docker ps`、`kubectl get pods` 这些日常运维命令也有

还有个比较有意思的是 `rtk read`，带 `-l aggressive` 参数的时候只返回函数签名，不返回函数体，看代码结构的时候特别有用。

## 实际用下来

装好之后重启 Claude Code 就自动生效了。用的过程中其实感受不到 RTK 的存在——它就是在后台默默干活。你跟 Claude Code 对话，它该怎么跑命令还怎么跑，只是返回的输出变精简了。

想看看省了多少可以跑：

```bash
rtk gain
```

可以看到每个命令省了多少 token、平均压缩率多少、总执行时间多少。
![image.png|300](https://imgbed.anluoying.com/2026/05/8636eda6ee736803476b63463e84cb08.png)
> 我才刚装十分钟 哈哈

今日未安装前使用统计
![image.png|300](https://imgbed.anluoying.com/2026/05/38d129e1709708ac94baaa367cc40bdc.png)

按这个比例，一天能省不少


另外 `rtk discover` 也很实用，它会扫描你历史的 Claude Code 会话，找出那些没走 RTK 的命令——意思就是"你还有这些命令可以优化，别浪费了"：

```bash
rtk discover
```

![image.png|300](https://imgbed.anluoying.com/2026/05/4fdc95c2be6df213d915b82520217e2f.png)

这个暂时就没收集到信息

## 一些细节

几个值得注意的点：

**失败时的 tee 机制**。RTK 默认会保存命令的完整原始输出。如果过滤后的输出太精简导致 AI 判断失误、命令执行失败了，它可以从保存的完整输出里读，不用重新跑一遍命令。这个设计挺聪明的。

**不是万能的**。RTK 只能过滤 bash 工具的输出，Claude Code 内置的 `Read`、`Glob`、`Grep` 这些原生工具它似乎是管不到的。所以要最大化效果，还是得配合 hook 用。

**支持的 AI 工具不止 Claude Code**。GitHub Copilot、Cursor、Gemini CLI、Codex、Windsurf、Cline 这些也都支持，基本上主流的 AI 编程助手都能用。不过 hook 的接入方式各不相同，有的是 PreToolUse，有的是 AGENTS.md 注入，具体得看文档。

## 一个 Rust 单文件二进制

最后说一下，RTK 本身是一个 Rust 写的单个二进制文件，不到 10MB，没有任何运行时依赖。GitHub 上 47k star，900 多个 commit，迭代挺活跃的（写这篇文章的时候最新版是 v0.39.0）。

对了，它还有个 `rtk telemetry` 命令，默认是关闭的。如果你愿意贡献使用数据来帮助改进，可以手动打开：

```bash
rtk telemetry enable
```

收集的数据不含任何源码、文件路径或个人信息，就是一些聚合的命令统计和 token 节省数据。

## 总结

总之，目前用下来感觉就是一个"装了就忘"的工具——装好之后完全透明地工作，你不会注意到它，但钱包会替你记住它。对于重度 vibe coder 来说，值得试用。

我主要担心的是，他压缩后内容给到 AI 太少，导致 AI 判断错误。目前看来这些可压缩命令应该不会造成这个问题，而且 45k + 的 stars 哪怕挤掉水分也是大户了。
