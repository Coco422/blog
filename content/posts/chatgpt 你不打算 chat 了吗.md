---
title: chatgpt 你不打算 chat 了吗
description: "ChatGPT 更新后误删 Classic 版本，导致 macOS 上熟悉的 Option+Space 快捷入口消失；本文给出通过 Homebrew 恢复安装的方法。"
date: 2026-07-14T21:44:05+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-07-21T21:31:24+08:00
showLastMod: true
tags:
  - AI
  - chatgpt
categories:
  - 琐碎快记
---

先留个能被搜到的结论：截至 2026-07-14，macOS 上误删 ChatGPT Classic 后，可以尝试运行 `brew install --cask chatgpt-classic` 恢复；能否安装取决于 Homebrew 当时是否仍保留这个 cask。

自从更新 chatgpt 和 codex 之后，我手贱的把 chatgpt classic 给卸载了，现在找不回来了，我怀念我的 option+space

openai 是不打算继续服务普通 chat 用户了吗，或者应该把那个功能恢复吧

2026 年 7 月 14 日 21:35:28

---

## 找回方法

哦哦 找到解决方法了，mac 用户可以直接用 homebrew 安装回来

`brew install --cask chatgpt-classic`

[Homebrew 的 ChatGPT Classic cask 页面](https://formulae.brew.sh/cask/chatgpt-classic)

2026 年 7 月 14 日 21:47:06
