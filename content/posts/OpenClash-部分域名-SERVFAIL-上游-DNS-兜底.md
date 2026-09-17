---
title: OpenClash 部分域名返回 SERVFAIL：给上游 DNS 加一个兜底
description: 记录一次 OpenClash 重启后 PicGo 图床域名解析失败的排查：Fake-IP 域名看似正常，真实 IP 查询却返回 SERVFAIL，补入可达的上游 DNS 后恢复。
date: 2026-09-18T01:41:16+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-09-18T02:05:08+08:00
showLastMod: true
tags:
  - OpenClash
  - DNS
  - Fake-IP
categories:
  - 杂技浅尝
---

给 [WireGuard Endpoint 排除 Fake-IP](/posts/vps-wireguard-openwrt-固定中转访问家庭局域网实验记录/) 后，我重启了 OpenClash。随后 PicGo 报图床域名解析失败。一开始以为是那个域名的记录坏了，后来发现是旁路由的普通 DNS 查询出了问题。

## 怎么确认是旁路由 DNS

Mac 走 OpenWrt 旁路由时，查询图床域名返回 `SERVFAIL`；直接问主路由却能得到真实 IP。`baidu.com` 等需要真实 IP 的域名也失败，而 `google.com` 还能拿到 `198.18.x.x` 的 Fake-IP。这说明“Fake-IP 能返回”不等于上游 DNS 正常。

```bash
dig @192.168.50.80 imgbed.example.com A  # SERVFAIL
dig @192.168.50.1  imgbed.example.com A  # NOERROR，真实 IP
```

检查发现，这份 OpenClash 配置的 `nameserver` 只有两条经代理组访问的海外 DoH；当时它们没有完成真实地址查询。修复时保留原有 DoH，只补入一条在路由器上已验证可达的 DNS：

```yaml
dns:
  nameserver:
    - 223.5.5.5
    # 原有 DoH 配置继续保留
```

配置校验通过并重启 OpenClash 后，旁路由和 Mac 都能解析图床域名，HTTPS 请求返回登录页跳转；WireGuard 域名与隧道也仍正常。这里记录的是这次环境的修复，并不表示所有 `SERVFAIL` 都能靠增加一个 DNS 解决。更重要的是：改完代理或 DNS 配置，除了测 Fake-IP，还要测一个必须返回真实 IP 的域名。

参考：[Mihomo DNS 配置说明](https://wiki.metacubex.one/config/dns/)。
