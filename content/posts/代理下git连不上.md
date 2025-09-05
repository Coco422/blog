---
title: 代理下git连不上
description:
date: 2025-08-24T01:56:31+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
tags:
  - ""
categories:
  - ""
  - 琐碎快记
---
在代理下，git使用ssh 22端口时连接不上。关掉代理就可以

参考本文
[本地打开代理，Git无法使用SSH连接GitHubGitHub SSH连接的血泪史:短短一行报错，让我在接下来的48小时 - 掘金](https://juejin.cn/post/7477133262423900160)

但是实际上我并没有使用ncat

只是在ssh 的config中

```yaml
Host github.com 
	Hostname ssh.github.com 
	IdentityFile ~/.ssh/id_rsa 
	Port 443 
	ServerAliveInterval 20 
	User git

```

Port 443 绕过。似乎暂时没遇到什么问题