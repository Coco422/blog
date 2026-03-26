---
title: ClawdBot 在 树莓派上
description: ClawdBot（现已改名 Moltbot）在树莓派上的安装与配置实践，包括 skills 配置和使用经验分享。
date: 2026-01-28T11:18:13+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-02-25T11:38:06+08:00
showLastMod: true
tags:
  - llm
  - agent
  - openclaw
categories:
  - 杂技浅尝
---
> 截止到写这篇文章，ClawdBot 已经火出圈了，被 Anthropic 告了一手后现在已经改名 Moltbot，🦞龙虾 bot。
> 
> 之前在我自己的服务器上安装过，但是看到很多 skills 的配置比较繁琐（我连敲代码都很少配置外部能力。）实在是没有精力搞，所以也没觉得很牛。但是最近翻出公司的老树莓派就不一样了。废物必须利用，折腾永垂不朽。

## 安装

🦞bot 的作者是推崇 一键安装的，所以他们为这个努力了不少，那么理论上我应该也可以诶
`curl -fsSL https://clawd.bot/install.sh | bash`，果然一路畅通无阻

这其中唯一的坑就是 minimax 的官方配置是 海外的站、而我使用的账号是国内版、所以需要修改一下 baseurl、这里当时忘记截图了，总之根据官方文档改一下 json 就行

## 使用

写文时想到使用飞书、此时尚未有人做适配，我也为了浅尝就不折腾太多了，配置 tg bot 试试，

![](https://imgbed.anluoying.com/2026/02/ae21a40c3ebdc00b6f9eb2226f938157.png)

效果图：

![image.png](https://imgbed.anluoying.com/2026/03/52ffeb67c2e01179d91a93b0ca8f98ad.png)

叫上同事进来试了一下，没想到还真的能用。功能一切正常，简单试了一下，模型能力挺重要的，如果没有定时提醒之类的能力，agent 还是比较鸡肋，但是如果未来接入飞书、配合适当的 skills、做好持久 memory，那么个人秘书就在眼前了。

唯一的缺点是每次运行都在持续消耗 money。