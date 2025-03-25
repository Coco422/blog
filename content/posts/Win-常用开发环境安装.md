---
title: "Win 常用开发环境安装"
description: 
date: 2025-03-21T23:14:48+08:00
image: 
math: 
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
---

> 记上一次急躁的我为了扩C盘直接抛弃了D盘后。所有开发环境也被我删干净了，都在D盘。正好那就重新安装，顺便记录一下。
> 我主要用到的环境一般是python java和node
> 这里java因为许久未碰。我都把我JB系列的软件都删了，现在是cursor用户也足以。主要是常常会在公司打开接近十几个工作空间。五个桌面，轻量的vscode配合插件也足以

所以我首先安装miniconda，用来管理python环境
## Conda

> Conda is an open source package management system and environment management system for installing multiple versions of software packages and their dependencies and switching easily between them. It works on Linux, OS X and Windows, and was created for Python programs but can package and distribute any software.

最初接触Python的时候还是 Python3.7，就是五年前的事情了。那时候对于Anaconda的安装都是模模糊糊的。后来也是摸爬滚打，像Python Java系列的依赖，觉得比C++真的容易太多了。

这里准备安装的是miniConda。顾名思义，mini版

这一类安装 建议参考官方文档，所以先放上链接[miniconda/intstall](https://www.anaconda.com/docs/getting-started/miniconda/install)

然后是我的安装步骤

诶，太久没装了吗。原来win直接装一个exe就一步到位了
尬住了
那就装一下node吧

## node

因为调试需求。node也会需要不同的版本。之前用的是nvm管理不同的版本，所以还是继续安装nvm

>题外话好像也有人做了jvm 管理不同的jdk版本。不过之前都是手动切换 顶多也是java1.8和java十几

[GitHub - nvm-sh/nvm: Node Version Manager - POSIX-compliant bash script to manage multiple active node.js versions](https://github.com/nvm-sh/nvm)

突然想了想 在家里开发用到node应该很少了，先不要增加太多实体。参考git仓库应该足矣