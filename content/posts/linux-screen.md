---
title: "screen：SSH 断了，任务还在跑"
description: 在服务器上跑耗时任务时怎么让任务不跟着 SSH 一起死，以及 screen 的 detach、reattach 和几个常见坑。
date: 2026-10-17T02:37:29+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-10-17T02:37:29+08:00
showLastMod: true
tags:
  - linux
  - screen
  - ssh
categories:
  - 杂技浅尝
---

在服务器上跑一个要十几分钟甚至几个小时的任务，最怕的不是任务失败，是网络抖一下，SSH 断开，任务跟着一起没了。

`nohup` 能解决一半问题——任务不停，但你看不到它的输出了，也没法中途敲个回车、看一眼进度。真要盯着一个跑很久的东西，还是得有个能"离开再回来"的会话。

screen 就是干这个的。

## 装

Ubuntu / Debian：

```bash
sudo apt install screen
```

CentOS 那套是 `sudo yum install screen`。

第一次用之前先确认一下有没有：

![screen 版本与第一次创建 detached 会话](https://imgbed.anluoying.com/2026/10/7091aa79b5f6766396622ce216d2ecbb.png)

## 最核心的三步

整个 screen 的用法，日常其实就三个动作：**开一个会话、从会话里溜走、再回来**。

开一个带名字的会话（推荐起名字，不然靠 PID 认人，几个会话叠在一起会很痛苦）：

```bash
screen -S build
```

进去以后看起来和普通终端一样，该干嘛干嘛。想溜走，按 `Ctrl+A`，松手，再按 `D`。

这个操作叫 detach，按完会回到原来的 shell，并提示 `[detached from 12345.build]`。这时候关掉终端、断网、下班走人，都没关系，会话还在服务器上，任务还在跑。

想回来：

```bash
screen -r build
```

如果会话名字想不起来，先看一眼列表：

```bash
screen -ls
```

`(Detached)` 就是没人连着、后台跑着。列表里的 `19606` 是 PID，也是会话的唯一标识，两个会话重名的时候就得靠它：`screen -r 19606`。

## 不进去也能看它在干嘛

有时候我只是想确认一下那个任务跑到哪了，不想真的接管这个会话。

`-X` 是可以往会话里发命令，`hardcopy` 是把会话的屏幕内容导出到文件：

```bash
screen -S build -X hardcopy -h /tmp/hc.txt && cat /tmp/hc.txt
```

![用 hardcopy 查看 screen 会话里的输出](https://imgbed.anluoying.com/2026/10/8d1d1e8a6dd84fbfd4fcdbfa5cac7ef2.png)

上面这段就是那个 `build` 会话里真的跑过的内容：在会话里打包了 `/etc`，然后把结果看一下。

`-h` 表示连回滚缓冲区一起导出，也就是往上翻很多屏的历史也带上。所以就算不 attach 进去，也能知道里面发生了什么。

顺手说一句，`-X` 往会话里塞命令也能用来干活，比如 `screen -S build -X stuff "ls -lh /tmp\n"`，等于替你在那个会话里敲了一行回车。

## 关掉

在会话里面直接 `exit`，或者在外面：

```bash
screen -S build -X quit
```

![退出 screen 会话后列表变空](https://imgbed.anluoying.com/2026/10/8eb8638537b1f59866283a0fd3baf61b.png)

`quit` 之后列表里就没有它了。如果列表里出现的是 `Dead` 状态的僵尸会话，用 `screen -wipe` 清掉。

## 几个真会卡住的地方

**`screen -r` 说 Attached。** 说明这个会话在别的地方还连着——可能是你另一个终端窗口没关，也可能是上次 SSH 断得不干净。两种做法：`screen -r -d` 把原来的连接踢掉自己接上，或者 `screen -x` 直接加入，两个人看同一个屏幕。

**`There is no screen to be resumed`。** 没这个会话。多半是名字打错了，先 `screen -ls` 看看真实的名字和 PID。

**`Cannot open your terminal '/dev/pts/0'`。** 常见于在脚本里、或者在 `sudo su -` 之后执行 screen。当前 shell 没有拿到 tty，screen 就没法接。用 `script -q /dev/null` 包一层能绕过去。

**会话里的中文和回滚行数。** screen 默认的回滚缓冲是 100 行，往上翻就没了。在 `~/.screenrc` 里写 `defscrollback 10000` 能让它多留一些，这个我还没改，翻不到的时候再说。

## 和 tmux 的关系

写这个必然会被问为什么不用 tmux。tmux 功能更多、配置更花，键位也更现代（前缀是 `Ctrl+B`）。

但服务器上 screen 一般是现成的，或者一个 `apt install` 就有，占的资源也小。我在这儿的需求就是"任务别断、回来能看"，screen 够用。

先把 screen 记熟，哪天真被它的限制烦到了再换 tmux，那时候换起来也就是改几个键位的成本。

参考：[GNU Screen 手册](https://www.gnu.org/software/screen/manual/screen.html)

先这样。
