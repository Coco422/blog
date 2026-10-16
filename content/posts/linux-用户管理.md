---
title: "Linux 用户管理：useradd 之后我总忘的那几件事"
description: 新建用户、改密码、加组、给 sudo 权限、服务账号和删号，把这几个命令和它们的坑按自己的用法记一遍。
date: 2026-10-17T02:36:02+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-10-17T02:36:02+08:00
showLastMod: true
tags:
  - linux
  - useradd
  - sudo
categories:
  - 杂技浅尝
---

每次给新机器开账号，或者给某个服务单独建一个运行用户，我都要现场搜一遍 `useradd` 的参数。不是不会，是记不住，而且每次搜到的答案还不太一样。

这次干脆按自己的用法抄一遍，顺便把几个真会出事的点标出来。

## 建一个用户

最常用的就这一行：

![useradd 新建用户、设置密码并查看 id](https://imgbed.anluoying.com/2026/10/873d040fc88bc09cb45a63a9890ea180.png)

`-m` 是给这个用户建 home 目录。**这个参数一定别漏**，Ubuntu 下有些版本不加 `-m` 就不建 `/home/alice`，登录进去发现没家，很多工具的配置又都往家目录里写，会莫名其妙地报权限错。

`-s /bin/bash` 是指定登录 shell。不加的话看系统默认，Ubuntu 上是 `/bin/sh`，某些发行版甚至给 `/usr/sbin/nologin`。

改密码用 `passwd`：

```bash
sudo passwd alice
```

然后 `id` 看一眼，重点是那个 uid 和 gid：

```bash
id alice
# uid=1000(alice) gid=1001(alice) groups=1001(alice)
```

`/etc/passwd` 那行也值得看一眼格式，七个字段是 `用户名:密码占位:uid:gid:注释:家目录:shell`：

```text
alice:x:1000:1001::/home/alice:/bin/bash
```

密码那个字段是 `x`，真正的哈希在 `/etc/shadow` 里，那个文件只有 root 能读：

```bash
sudo ls -l /etc/shadow
# -rw-r----- 1 root shadow 707 Oct 17 02:02 /etc/shadow
```

## 加组，注意 -a

给用户加一个附加组：

![把用户加进 devs 和 sudo 组](https://imgbed.anluoying.com/2026/10/ca044dc0334eba591ffe1e903d93c3d2.png)

`-aG` 里的 `a` 是 append。**这个 `a` 千万别省**。

`usermod -G devs alice` 的意思是"把 alice 的附加组设置为 devs"，是覆盖，不是追加。要是 alice 本来还在 `docker` 组里，这一下就给她踢出去了，人还完全不知道，排查起来很难想到是这一步干的。

给 sudo 权限也是同一招，Ubuntu/Debian 是加到 `sudo` 组，CentOS/RHEL 那边是 `wheel`：

```bash
sudo usermod -aG sudo alice
```

加完要重新登录才生效，`id` 里能看到多出来的组：

```text
uid=1000(alice) gid=1001(alice) groups=1001(alice),27(sudo),1002(devs)
```

## 服务专属账号

给一个跑服务的用，不需要登录，也不需要家目录：

![服务账号、sudoers 校验和删除用户](https://imgbed.anluoying.com/2026/10/5055d237a0171bd05b8c3670e0a53841.png)

`-r` 是 system account，uid 从系统保留的那段里分配，一般小于 1000；`-M` 表示不建 home；shell 给 `/usr/sbin/nologin`，这样即使有人拿它的身份登录也进不去。

这种账号是给进程用的，权限越少越好，出事的时候损失也小。

## sudo 白名单放 /etc/sudoers.d

不要直接改 `/etc/sudoers`。那个文件改坏了，sudo 直接不能用，而很多机器又没给 root 配密码，等于把自己锁在门外。

惯例是在 `/etc/sudoers.d/` 里单独放一个文件：

```bash
echo 'alice ALL=(ALL) NOPASSWD:ALL' | sudo tee /etc/sudoers.d/alice
```

然后一定要检查语法：

```bash
sudo visudo -c
```

这里我第一次跑就报错了，`/etc/sudoers.d/alice: bad permissions, should be mode 0440`，因为 `tee` 建出来的文件是 644。sudo 会直接忽略权限过宽的文件，所以语法检查不过，加个 chmod 就好：

```bash
sudo chmod 0440 /etc/sudoers.d/alice
```

这个坑挺典型的，文件内容一个字没错，就是权限不对。

顺便看一眼账号的密码策略：

```bash
sudo chage -l alice
```

`Maximum number of days between password change: 99999` 意思是密码永不过期。公网机器上建议改小，改法就是 `sudo chage -M 90 alice`。

## 删号

```bash
sudo userdel -r alice
```

`-r` 是连家目录和邮箱一起删。不加的话 `/home/alice` 会留着，里面可能有 SSH key、数据库密码之类的，人已经删了东西还在，不如一起清掉。

删完再 `id` 一次确认：

```text
id: 'alice': no such user
```

删除这一步唯一的忠告是：动手前先 `whoami`。删到当前登录的这个账号，session 不会立刻断，但 sudo 权限会一起没掉，那时候能做的操作就不多了，得去控制台救。

## 记不住的话

常用就这几个：`useradd -m -s`、`passwd`、`usermod -aG`、`userdel -r`。
坑就两个：`-m` 别漏，`-aG` 的 `a` 别省。

参考：

- [useradd(8) man page](https://man7.org/linux/man-pages/man8/useradd.8.html)
- [Ubuntu Server 文档：User management](https://documentation.ubuntu.com/server/how-to/security/user-management/)

收工。
