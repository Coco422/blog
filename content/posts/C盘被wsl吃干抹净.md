---
title: C盘被wsl吃干抹净
description: wsl在C盘上占据空间太多怎么迁移默认盘符
date: 2026-02-02T21:35:02+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-02-02T22:11:07+08:00
showLastMod: true
tags:
  - linux
  - windows
  - wsl
categories:
  - 杂技浅尝
---
## 前言

说是 被 WSL 给吃干抹净是不严谨的，但是这次出现的问题是公司一台开发机器。512 拆分两个盘，而我在运行 WSL Ubuntu 的过程中突然断联，说

```powershell
(base) PS C:\Users\mck-dev> wsl
<3>WSL (40532 - Relay) ERROR: CreateProcessParseCommon:1003: getpwuid(1000) failed 5
<3>WSL (40532 - Relay) ERROR: ConfigUpdateLanguage:2519: fopen(/etc/default/locale) failed 5
<3>WSL (40532 - Relay) ERROR: operator():577: getpwuid(0) failed 5
<3>WSL (40532) ERROR: I/O error @util.cpp:1356 (UtilInitGroups)
<3>WSL (40532 - Relay) ERROR: CreateProcessCommon:805: Create process failed
```

一看C盘已经不是爆红，而是彻底满了。

这让我想起来 WSL 默认的文件系统应该也是在 C 盘（上次操作docker 给客户操作了一次），那我应该迁移一次，但是这次不是docker，怎么迁移这个文件系统

在WSL setting中找到文件系统的菜单中只有大小的设置，那么看来没有什么GUI的工具能帮我啦。

> 遇到这种问题其实很生气，因为我当时强行合盘，在我获得一个 2T的 C盘时，给我电脑造成超多碎片垃圾到现在没有清理干净。真是丧尽天良的落后设计。

## 导出内容

WSL 的“默认盘符”本质上是 **发行版的 ext4.vhdx 所在位置**。  
只要 ext4.vhdx 在 D 盘，本质就已经迁移完成。

![image.png](https://imgbed.anluoying.com/2026/02/f48d06d5bd05c7269da0c4c9d3af3451.png)

他已经来到了8G，对于这台118GB的 C盘，之前又装了 Epic 开发UE5，爆满在意料之中

执行以下命令把他导出

```powershell
(base) PS C:\Users\mck-dev> wsl --export Ubuntu-22.04 D:\wsl\ubuntu.tar
正在导出，这可能需要几分钟时间。 (0 MB)

无法启动分发。错误代码： 6，失败步骤： 2
错误代码: Wsl/Service/E_FAIL
```

结果失败了，我猜爆满的C盘已经没有能力启动 WSL 。那么通过 WSL 去导出文件已经不可能。那就只能先清理一部分了。

清理了常见的 temp 和download，没有任何改善，此时我可以抛弃wsl的数据，

```powershell
wsl --shutdown
wsl --unregister Ubuntu-22.04
```

但是我决定抢救一下。

找到C盘根目录有一个 pyhon3.13，删除！解救 150 MB。尝试export，还是失败

看到个 dotnet，删了，回头有要跑的同事就再下载一次吧。结果还是失败

一怒之下，认识的全删了

## 注销原发行版

`wsl --unregister Ubuntu-22.04`

## 重新导入

`wsl --import Ubuntu-22.04 D:\wsl\Ubuntu D:\wsl\ubuntu.tar --version 2`

完成后，Ubuntu 的 ext4.vhdx 就会在：
`D:\wsl\Ubuntu\ext4.vhdx`

## 意外出现，WSL默认用户变化了

当我重连后，发现我的默认用户`mckjue5`丢了

登录后看到的是 # 但是好在数据都还在

```bash
root@mckj-dev-ue5:/home/mckjue5/qwen3asr# grep mckjue5 /etc/passwd
mckjue5:x:1000:1000:,,,:/home/mckjue5:/bin/bash
```

太好了，那使用这个用户登录

```powershell
(base) PS C:\Users\mck-dev> wsl -d Ubuntu -u mckjue5
```

```bash
mckjue5@mckj-dev-ue5:/mnt/c/Users/mck-dev$ ubuntu2204.exe config --default-user mckjue5
```

```powershell
(base) PS C:\Users\mck-dev> wsl
```

```bash
To run a command as administrator (user "root"), use "sudo <command>".
See "man sudo_root" for details.

mckjue5@mckj-dev-ue5:/mnt/c/Users/mck-dev$
```

可以，成功了。