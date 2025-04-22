---
title: 安装 Ubuntu
description: 在 windows 主机上替换安装 Ubuntu
date: 2025-04-22T18:24:43+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
tags: 
categories:
  - ""
---

> 其实有想过保留两个系统，但是备份完之后觉得没这个必要了，主要是不需要 windows 做什么，公司也还有 win 电脑

## 准备工作

1. 64GB U 盘，（狗东 26 块的闪迪，有活动 18，够够的了，想当年买个 8G 还要我 72 块钱）
2. Ventoy 一个（制作可启动U盘的开源工具。1 是微 pe 不能直接装 linux，2 是其他pe 系统我总感觉乱乱脏脏的，这个直接把系统镜像拖进去就可以了。很完美）
3. Ubuntu 镜像，官网下就可

## Ventoy安装

我在 mac 上不知道为什么启动不了 arm64 的 ventoy 工具，上 win 直接解决了。傻瓜式操作，不用一分钟，建议看官方文档
[News . Ventoy](https://www.ventoy.net/cn/doc_news.html)

## 镜像

[Download Ubuntu Desktop \| Ubuntu](https://ubuntu.com/download/desktop)

## 备份老电脑

## 安装 Ubuntu

1. 插入 U 盘
2. 进 bios，我不知道这个主板用的啥 直接常用按键一把搂
3. 使用 u 盘启动，这个bios 略有区别，可以自行搜索相关资料
4. 很开心的看到了（这里用的官方截图，选择 Ubuntu 系统）
5. ![image.png](https://imgbed.anluoying.com/2025/04/a9312e8ff46cd88bbfd59e5fb4950047.png)
6. ![image.png](https://imgbed.anluoying.com/2025/04/c4c9ddc4c9be41237ad9e46cd9df8a3b.png)
7. 这里我的界面和这个略有差别，但是基本一致。选择了try Ubuntu or install Ubuntu

结果就卡在了一个 LOGO 界面了
郁闷，但是机智的我猜到了是因为显卡驱动的问题，这机子上还有一张 3060，显示屏连着显卡，百度一下

### 解决安装Ubuntu N卡冲突

[# 安装Ubuntu16.04卡在Ubuntu的logo界面解决方法](https://developer.aliyun.com/article/1061154)

1. 在 GRUB 界面按 e 
2. 我这里把 --- quite splash 改成了 quite splash nomodeset
3. F10 保存进入系统。
OK 了。然后安装系统

但是我没有出现后续的问题。安装完毕后直接重启系统可以直接进入

那就贴一下上面命令的解释。这个 nomodeset 是内核启动时传递的设置

- quiet：禁止大多数启动信息的输出（减少屏幕刷文字）。
- splash：显示启动动画（比如 Ubuntu 的 logo）。
- $vt_handoff：这个是 Ubuntu 系统中用来控制图形界面接管虚拟终端的参数变量，确保从内核启动到图形界面平滑过渡。
- nomodeset 是一种 **禁用内核模式设定（KMS, Kernel Mode Setting）** 的方式。

nomodeset 设置防止启动时加载显卡驱动并切换分辨率
到此为止系统就 ok 啦。总时长不到 15 分钟。等待安装 10 分钟。