---
title: weclone 跟风
description: 基于微信聊天记录微调一个 qwen2.5-7B
date: 2025-05-19T18:08:30+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
tags:
  - llm
categories:
  - 杂技浅尝
lastmod: 2025-12-10T00:26:46+08:00
---
> 克隆自己

[GitHub - xming521/WeClone: 🚀从聊天记录创造数字分身的一站式解决方案💡 使用聊天记录微调大语言模型，让大模型有“那味儿”，并绑定到聊天机器人，实现自己的数字分身。 数字克隆/数字分身/数字永生/LLM/聊天机器人/LoRA](https://github.com/xming521/WeClone)

准备环境咯
然后先下载模型，但是我有了所以先准备数据
## 1. 数据准备

手机备份数据上电脑
我勒个豆，记得需要从手机上操作聊天记录迁移到电脑。电脑微信的备份聊天记录是加密仅供未来还原到手机的，吭哧吭哧传了很久。发现不是我要的效果

然后使用[GitHub - xaoyaoo/PyWxDump](https://github.com/xaoyaoo/PyWxDump)导出数据csv

## 2. 洗数据
这里用的 7B 模型 vllm 推理进行打分，我都没看导出来一些啥数据。。洗完再看看
![image.png](https://imgbed.anluoying.com/2025/05/5c9512caac0aa70127a1b24399e748cc.png)

![image.png](https://imgbed.anluoying.com/2025/05/0779d2884b6f9a4bf239a7ad224b0b8e.png)
## 开始训练

![image.png](https://imgbed.anluoying.com/2025/05/d050a68070c3a858454fdbd267e135a4.png)

这里想用多卡来着。但是我的 23 卡和 01 卡链接似乎有问题，干脆单卡跑算了

训练的时候看了眼数据。我的聊天又小又短，感觉数据集不是很有用

## 结果

果然。这样默认跑出来一个智障，基本上只会回几个字，倒是很符合我的回复习惯

![image.png](https://imgbed.anluoying.com/2025/05/3fb77553f5134efd107d2d6a2a5c2fff.png)

后面整理个干净点的数据再训练一个