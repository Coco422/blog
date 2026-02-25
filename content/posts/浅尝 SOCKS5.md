---
title: 浅尝 SOCKS5
description:
date: 2025-12-16T17:57:46+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-12-20T11:38:51+08:00
showLastMod: true
tags:
  - network
categories:
  - 杂技浅尝
---
> [!NOTE]
> socks5 是什么，是不是还有 1234，socks5 和 常见的 vless 等一样吗 ？和 vpn 一样吗？怎么用呢？怎么建立呢？假如我有一个服务器 A 在美国，还有一个服务器B 在香港。我要访问的服务不允许香港IP。我应该怎么做呢？

最近做一些小项目遇到的问题，让我云里雾里，本身关于这些的知识就没有系统学过，当实践用到时难受的一比，而 GPT 最近的一次更新后一直根据长期 memory 回答我的问题，污染严重，蠢得如同**


---

## 项目概况

项目可以理解为某平台简易注册机、批量注册账号有一个需要注意的就是隐藏你的真实信息，当我固定一个 IP 和固定的 session 信息或 浏览器指纹进行大量账号注册是肯定会出发风控的。
而 playwright 配合 Chromium + 带认证的 SOCKS5 代理是不能很好的兼容，所以引发了一些知识补充过程

本文主要是解决网络问题。

## 术语解释

#### **SOCKS5 是什么？**

[SOCKS - Wikipedia](https://en.wikipedia.org/wiki/SOCKS)

SOCKS5（Socket Secure 5）是一种**网络代理协议**，作用就是在你的电脑（客户端）和目标网站/服务之间插入一个“中间人”（代理服务器），负责转发数据。它支持 TCP 和 UDP（游戏、视频、BT 都行），还支持用户名密码认证、IPv6 和域名解析。

它**不自带加密**（数据明文），所以速度快，但单独裸用不太安全（常和 TLS 等结合）。

---

#### **SOCKS5 和常见的 VLESS 等一样吗？**

**不一样**，是不同层面的东西：

- **SOCKS5**：一般是**本地接口**（你电脑上 127.0.0.1:1080），浏览器或软件直接连它。
- **VLESS**（或 VMess、Trojan、Hysteria2 等）：是**远程服务器协议**，主要用在 V2Ray/Xray/sing-box/Clash 这类工具里。它轻量、支持加密+伪装，专门用来“翻墙”或抗检测。

典型用法： 你的软件（Clash/sing-box）本地开一个 **SOCKS5 端口** → 用 **VLESS 协议** 加密连海外服务器 → 服务器再直连互联网。

所以 VLESS 常“包裹”在外面，SOCKS5 是给你本地程序用的出口。

---

#### **和 VPN 一样吗？**

**不一样**：

| 项目   | SOCKS5 / 代理          | VPN（如 WireGuard、OpenVPN） |
| ---- | -------------------- | ------------------------ |
| 工作层级 | 应用层（可只代理部分程序）        | 网络层（几乎全流量）               |
| 加密   | 默认不加密（更快）            | 强制全加密                    |
| 速度   | 更快                   | 稍慢（但现代协议差距小）             |
| 使用方式 | 需要软件支持或 Proxifier 强制 | 系统全局，无感                  |
| 灵活性  | 极高（可分流规则）            | 一般                       |

现在很多工具（Clash Meta、sing-box）的 **TUN 模式** 可以让代理效果几乎和 VPN 一样全局，还能智能分流。

## 实现思路

Python + Qt 桌面程序控制的 playwright 无法直接通过配置参数来使用我的”需要认证“的 IP 池，所以想到加一个中间层。那就是在本机先用支持认证的库构建连接，转成本地无认证 SOCKS5，然后 playwright 连接本地的端口

这里由 GPT 推荐。我使用的是 gost。[Releases · ginuerzh/gost](https://github.com/ginuerzh/gost/releases)
解压得到 gost.exe，放到你的项目目录（用 PyInstaller 打包时加到 data_files）

我的程序最终使用路径如下，当然 HK 这个server 也可以不要，直接本地也是可以用的。这里知识进行了一些基础术语的使用和思路，代码不方便分享，直接问 AI 就能得到了。

HK（低延迟入口）+ US 服务器

电脑 → **香港 B**（入口） → **美国 A 或代理池**（出口）

实现方式：

- 在香港 B 上跑一个 gost 监听 1080（或多端口）
- 香港 B 的 gost 再转发到你的动态代理池（或美国 A）
- 桌面程序只连 香港B_IP:1080/1081...（延迟最低）