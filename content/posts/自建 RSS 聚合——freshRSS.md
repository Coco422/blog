---
title: 自建 RSS 聚合——freshRSS
description: 本文介绍如何使用 FreshRSS 自建 RSS 聚合系统，通过 Docker 快速部署，支持多设备同步阅读。文章详细讲解了部署流程、订阅源配置及手机端阅读器选择，帮助用户高效管理信息源，提升阅读体验。
date: 2026-03-19T13:18:45+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-03-19T13:41:52+08:00
showLastMod: true
tags:
  - RSS
categories:
  - 杂技浅尝
---
> [!info] 
>  昨天在 L 站逛的时候，看到一位佬友推荐的信息源，[Hacker News](https://news.ycombinator.com/)，我英文水平没那么好，自然是少听说这些海外的信息平台，借着翻译进去看了一圈，真的非常有意思，于是又想盯他，然而此时我已经有几个平台会每天盯了。所以想到了很久之前听说过的 RSS。

## RSS是什么

RSS 是一种用于**自动获取网站更新内容的订阅技术**，全称是 **Really Simple Syndication**。它本质上是一种基于 XML 的数据格式，让网站把最新内容“推送”给订阅者，而不是你手动去刷新页面查看。

### **它是怎么工作的**

核心流程很简单：
1. 网站生成一个 **RSS Feed（订阅源）**
    - 通常是一个 .xml 地址
    - 里面包含最新文章、标题、摘要、链接等
2. 用户用 RSS 阅读器订阅这个 Feed
    常见工具：
    - [Feedly](chatgpt://generic-entity?number=0)
    - [Inoreader](chatgpt://generic-entity?number=1)
    - [FreshRSS](chatgpt://generic-entity?number=2)（自建）
3. 阅读器定时拉取更新
    有新内容就显示给你

本次我 在对比了几个 RSS 的订阅器后选择了 FreshRSS （单纯看起来比较简单），先上手用起来，再考虑以后的优化

## FreshRSS

选择这个 FreshRSS 还有几个原因是，
1. 我有服务器可以满足自托管的需求
2. 有一些信息源需要海外获取
3. 轻量

而且支持一些插件，所以我先打通我的 V1 部署之后，未来配合一个好用的 Claw 打通 V2 的需求

```
[RSS源] ---> [FreshRSS] ---> [数据库]
                      |
                      +--> Web UI
                      +--> API（客户端/自定义服务）
```

```
FreshRSS --> LLM服务 --> 智能摘要 / 分类 / 推荐
```

这样未来我的Claw 可以不止收集一个免费的头条信息。而是可以从我收藏的这些订阅源里面筛选出 总结出 我想看的内容

## Docker部署

实在是简单

```yaml
version: "3"

services:
  freshrss:
    image: freshrss/freshrss:latest
    container_name: freshrss
    restart: always

    ports:
      - "8080:80"

    volumes:
      - ./data:/var/www/FreshRSS/data
      - ./extensions:/var/www/FreshRSS/extensions

    environment:
      - TZ=Asia/Shanghai
```

`docker compose up -d` 即可。我简单 nginx 反代了一下，所以用域名进来就行

## 配置订阅源

我对具体的协议了解不够深，我只知道订阅源是一个 xml 的内容，在配置页面进行订阅后如下，找一找都能找到这些 RSS 订阅源，这里给大家推荐一个 github 仓库
[GitHub - amazingcoderpro/rss-recomanded: 值得推荐 RSS 订阅源整理，不定时持续更新 · GitHub](https://github.com/amazingcoderpro/rss-recomanded)
linux.do 的 Rss [论坛无处不在的RSS - 搞七捻三 - LINUX DO](https://linux.do/t/topic/23342)
我的博客的 RSS [安落滢 blog rss](https://blog.anluoying.com/index.xml)

这里比较遗憾的是，美团技术团队的文章很好看，但是似乎没有官方的 feed、我找到的几个在我部署的 FreshRSS 中无法订阅

只能之后再研究了

![image.png|300](https://imgbed.anluoying.com/2026/03/02515a728d0eab3f0bc58d44df429ea9.png)

订阅后效果如下
![image.png|300](https://imgbed.anluoying.com/2026/03/1950f219cdb07755840e073c5ee3ba39.png)

在 PC web 端用这个阅读也没啥毛病了，但是手机还得找个单独的阅读器

## 手机阅读器

我直接 google play 找了两个，最后选择`FeedMe` 当然大家可以了解透彻一点，关于不同阅读器和他们的特性我感觉不是很有时间一一挑选，差不多就先用着，未来不满意了再根据缺点换

这里我刚开始用了一个叫 Feeder 的，但是我 FreshRSS 聚合后有一些标题/来源 在 Feeder 里面看不出来，所以就不用他了。而 FeedMe可以分辨，就先用他了（我对使用的逻辑不算很满意，可能和我不怎么懂也有关系，我觉得交互不够直白，小白不友好）

[阅读器推荐-知乎](https://zhuanlan.zhihu.com/p/715661253)

![1070354059b2e79400c1d90f95c99c36.jpg|300](https://imgbed.anluoying.com/2026/03/6e812aceb20814ebd842d3a37f2afbac.jpg)

这里唯一一个配置的坑就是选择 FreshRSS 之后要输入 api 和 账号密码

![image.png|300](https://imgbed.anluoying.com/2026/03/a6b240c65e30c17bd1ca351df333907e.png)

api 从我箭头处查看，我直接复制了 第一个 Google Reader compatible API
密码这里设置后用的这个密码

## 参考文章

[GitHub - FreshRSS/FreshRSS: A free, self-hostable news aggregator… · GitHub](https://github.com/FreshRSS/FreshRSS)
[# 迄今感觉最好用的RSS阅读器——FreshRSS安装使用教程+RSS 订阅源](https://zhuanlan.zhihu.com/p/980649308)
