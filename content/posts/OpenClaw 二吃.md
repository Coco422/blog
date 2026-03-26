---
title: OpenClaw 二吃
slug: openclaw-feishu-integration
description: OpenClaw 配置连接飞书并且尝试对接 Qwen3.5-35B-A3B
date: 2026-02-25T17:54:16+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-02-25T19:05:05+08:00
showLastMod: true
tags:
  - llm
  - openclaw
categories:
  - 杂技浅尝
---
## 安装 OpenClaw

我也不知道啥情况，总之是三巨头各种折腾然后似乎被 openai 收入麾下了，我在第一次使用龙虾到现在他名字都换了两次了。所以把之前的清空配置，再重新安装。

[Install \| OpenClaw \| The AI That Actually Does Things](https://openclaws.io/install/)

这里我使用他的 sh 脚本访问不到，于是使用 pnpm 安装，然后 onboard


![image.png|300](https://imgbed.anluoying.com/2026/02/6de7d07bb00cb146cf390c9fea81b60d.png)

![image.png|300](https://imgbed.anluoying.com/2026/02/08264248fcc549fa8e29e429ecf54553.png)

这次多了不少配置，我们选择 vLLM 并且输入我对应的信息

![image.png|300](https://imgbed.anluoying.com/2026/02/b434f49e3715ea7cc18abed74c3c95dd.png)
这次有飞书可以选择了

## 配置飞书

参考文档
[Feishu - OpenClaw](https://docs.openclaw.ai/channels/feishu)

在权限页面，批量导入以下权限

```json
{
  "scopes": {
    "tenant": [
      "aily:file:read",
      "aily:file:write",
      "application:application.app_message_stats.overview:readonly",
      "application:application:self_manage",
      "application:bot.menu:write",
      "contact:user.employee_id:readonly",
      "corehr:file:download",
      "event:ip_list",
      "im:chat.access_event.bot_p2p_chat:read",
      "im:chat.members:bot_access",
      "im:message",
      "im:message.group_at_msg:readonly",
      "im:message.p2p_msg:readonly",
      "im:message:readonly",
      "im:message:send_as_bot",
      "im:resource"
    ],
    "user": ["aily:file:read", "aily:file:write", "im:chat.access_event.bot_p2p_chat:read"]
  }
}
```

![image.png|300](https://imgbed.anluoying.com/2026/02/3c1283bf724db015a58c7a24382ba1f1.png)

接下来没有踩坑。按照文档，发布版本->设置长连接->在 openclaw 配置 APPID 和 Secret -> 然后飞书里审核过了找机器人发一句话

然后把拿到的 Code 配置一下
![image.png|300](https://imgbed.anluoying.com/2026/02/6729403aa9c1a2cd4fa2dedb5a33c1f1.png)

`openclaw pairing approve feishu {code}`
这样子之后就可以正常问答了

![image.png|300](https://imgbed.anluoying.com/2026/02/94b36f94e369ae9e7fc3ed44a339be93.png)

模型整体能力不是很强，后面配一下对应的 skills 看看怎么用它