---
title: 后训练gemma4的说白话模型初尝
description: 记录在12GB显存的4070 Super上运行Q4_K_M量化版Baihua-Gemma4-E4B的初步体验，介绍其多风格白话改写效果、23秒加载时间与35—84 tokens/s生成速度，并说明后续测试计划。
date: 2026-10-13T01:09:19+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-10-13T01:42:23+08:00
showLastMod: true
tags:
  - llm
categories:
  - 杂技浅尝
---
刷推刷到个新模型，叫 Baihua-Gemma4-E4B。

我在 12GB 的 4070super 上跑了一下，毕竟只有这么点显存，跑个 4bit 量化的试试就行了。

跑完之后发现，这个模型的白话能力确实比我之前用的那些 skill 差不了太多了。 

给它一段书面语，让它改写成四种不同风格（朋友聊天、工作汇报、对客户、快速沟通），效果很不错。

还有就是， 性能方面呢，加载模型大概 23 秒，生成速度在 35 到 84 tokens/s 之间波动。 这个模型是 Q4_K_M 量化版本。

我确实也有直觉感觉，只有改到权重里面去才算真正改了它“基因里的味道”。

不过我现在只是在本地跑个测试而已。 接下来我会把这个模型放到服务器上，用 24GB 的 3090 再狠狠测一波。

可惜只会白话，不会学我的口吻。