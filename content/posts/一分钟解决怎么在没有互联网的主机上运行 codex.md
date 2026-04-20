---
title: 一分钟解决怎么在没有互联网的主机上运行 codex
description:
date: 2026-04-20T15:54:26+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-04-20T16:58:18+08:00
showLastMod: true
tags:
  - 服务器
  - agent
  - network
categories:
  - 杂技浅尝
---
> [!tldr] 
> 本地网络一切正常，能够正常访问外网/使用codex没有问题  
> 远程主机：只能通过ssh连接，无法联网（主要是翻墙不可以，无网的情况比较少） 
> 之前使用 cursor 时，网络请求走本地，context 在远端，所以迁移到 codex 和 claude code会有些许不便，今天才有空处理一下
> 简单来说直接设置 proxy 即可

本文以 VScode 为例，因为 Vscode + remote ssh + codex ex 都比较方便

最近 GPT5.4 的好用程度加上 claude 的获得太难。以半价怒冲了 200 刀的 GPTPro，实在是太爽了。
## **第一步：在 VS Code 中配置 SSH 反向转发**

1. 在本机的vscode上打开命令面板（ `Ctrl+Shift+P` (Mac 上是 `Cmd+Shift+P`)）
2. 输入 `SSH: Open SSH Configuration File` 找到你的配置文件（一般都是C:\Users\你的用户名.ssh\config）
3. 在你需要配置的服务器上添加如下操作：
![image.png|300](https://imgbed.anluoying.com/2026/04/c517ba7fd1c2f7b999c2670f2ff1f086.png)
> clash默认是7890，如果使用的是clash verge默认的是7897

## **第二步：告诉远程 VS Code 使用这个代理**

1. 重新连接现在的远程服务器，打开vscode设置（ `Ctrl + ,` 或 `Cmd + ,`）
2. **注意**： 在设置页面的顶部标签栏，点击 **“远程 [你的服务器名]” (Remote)**。如下图：  
![image.png|300](https://imgbed.anluoying.com/2026/04/2d21c68defc919955c325f846029d9ee.png)

3. 在搜索框中输入 `Http: Proxy`，输入`http://127.0.0.1:7890`， 也就是默认的代理
4. 取消勾选 `Http: Proxy Strict SSL`，具体如下图：  

![image.png|300](https://imgbed.anluoying.com/2026/04/caf627809a4f457a3d3ffa8a8ab45046.png)

## 第三步：爽用

重连服务器～
ok，完美
这里安装完 codex 差价之后，选择登录什么的不用担心回调，因为在本地唤起的浏览器 回调的是本地的 vscode 会处理。所以这个登录没啥问题。


## 参考文章

刚开始看了一遍知乎的这篇文章，感觉搞复杂了，但是也可以作为参考，以后也有思路，L 站这位佬的就很精准，方便，一分钟搞定

[在受限网络环境下使用 VS Code Remote-SSH + 本地代理 + Codex 插件完整教程](https://zhuanlan.zhihu.com/p/2009590635548665051)

[【教程】解决使用codex（claude code应该也是一样）无法在没有互联网的主机上运行的问题 - 搞七捻三 - LINUX DO](https://linux.do/t/topic/1807998)