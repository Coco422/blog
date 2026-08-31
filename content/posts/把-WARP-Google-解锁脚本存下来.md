---
title: "WARP Google 解锁脚本备份与使用说明"
description: "备份 VPS值得买的 WARP Google 解锁脚本，记录安装、验证、管理与卸载流程，并说明官方组件和第三方分流逻辑的边界。"
date: 2026-08-31T01:29:01+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-08-31T14:49:12+08:00
showLastMod: true
tags:
  - Cloudflare WARP
  - warp-cli
  - redsocks
  - iptables
categories:
  - 他山拾影
---

本文备份 VPS值得买发布的 WARP Google 解锁脚本及使用流程，方便原页面或脚本失效后继续查阅。

原脚本使用 Cloudflare 官方 `cloudflare-warp` 客户端，在本机建立 SOCKS5 代理，再通过 `redsocks` 和 `iptables` 将部分 Google IPv4 流量转入 WARP。脚本同时屏蔽指定的 Google IPv6 网段，避免 IPv4 与 IPv6 出口地区不一致。

> [!WARNING]
> 本文仅完成源码检查和语法检查，尚未在 VPS 上实际安装。脚本会修改软件源、iptables、IPv6 路由、`/etc/gai.conf` 和 systemd 服务，建议先在可重装的机器上验证。

## 下载脚本

- [本站备份：warp-google.sh](/downloads/warp-google/warp-google.sh)
- [原始脚本](https://vpszdm.com/warp-google.sh)
- [原始说明页](https://vpszdm.com/warp-google.html)

本站备份抓取于 2026 年 8 月 31 日，版本为 `1.0.0`，文件大小约 29 KB。

```text
SHA-256: 4c45421ad25eac15bf09dda25d6296cfef01e111e086f2f02001531bdd4fc52a
```

下载并校验：

```bash
curl -fL https://blog.anluoying.com/downloads/warp-google/warp-google.sh \
  -o warp-google.sh

echo "4c45421ad25eac15bf09dda25d6296cfef01e111e086f2f02001531bdd4fc52a  warp-google.sh" \
  | sha256sum -c -

chmod +x warp-google.sh
less warp-google.sh
sudo ./warp-google.sh
```

脚本启动后选择：

```text
1. 安装 WARP + 解锁 Google
```

安装过程还会询问是否配置 Google 透明代理，确认后才会安装 `redsocks` 并写入分流规则。

## 脚本安装了什么

| 组件 | 作用 |
| --- | --- |
| `cloudflare-warp` | Cloudflare 官方 WARP 客户端 |
| `warp-cli` | 注册、连接和管理 WARP |
| SOCKS5 `127.0.0.1:40000` | WARP Local proxy 出口 |
| `redsocks` `127.0.0.1:12345` | 接收 iptables 重定向的 TCP 流量 |
| `WARP_GOOGLE` | 保存 Google IPv4 分流规则的 iptables 链 |
| IPv6 黑洞路由 | 阻止脚本内指定的 Google IPv6 网段直连 |
| `warp-google.service` | 重启后恢复 redsocks 和 iptables 规则 |

其中，WARP 客户端、`warp-cli` 和 Local proxy 是 Cloudflare 官方能力；`redsocks`、iptables 分流、IPv6 黑洞和 systemd 管理脚本由原作者实现，不属于 Cloudflare 官方方案。

## 验证安装结果

查看整体状态：

```bash
warp status
```

对比直连 IP 和 WARP SOCKS5 出口 IP：

```bash
warp ip
```

单独检查 WARP：

```bash
warp-cli status
curl -x socks5h://127.0.0.1:40000 https://www.cloudflare.com/cdn-cgi/trace
```

返回内容应包含：

```text
warp=on
```

检查透明代理规则：

```bash
iptables -t nat -L WARP_GOOGLE -n --line-numbers
```

最后实际访问需要解锁的 Google 服务，确认出口地区和功能是否符合预期。HTTP `200` 只能证明页面可访问，不能单独证明地区识别已经修正。

## 日常管理与卸载

```bash
warp status
warp start
warp stop
warp restart
warp test
warp ip
warp uninstall
```

只停止透明代理并断开 WARP：

```bash
warp stop
```

卸载脚本安装的组件：

```bash
warp uninstall
```

当前版本卸载后仍需检查 `/etc/gai.conf`。脚本安装时可能追加下面这行，但卸载逻辑不会删除：

```text
precedence ::ffff:0:0/96  100
```

## 当前版本的注意事项

- 脚本只重定向 Google IPv4 的 TCP 流量，UDP/443 的 QUIC/HTTP3 不在现有规则内。
- Google IP 段为脚本内的静态列表，可能过期、遗漏或覆盖过宽；需要定期对照官方 `goog.json`。
- 部分 `warp-cli` 命令使用 `|| true` 忽略错误，安装结束后必须手动验证状态。
- 脚本会覆盖 `/etc/redsocks.conf`、`/usr/local/bin/warp` 和 `/usr/sbin/policy-rc.d`，已有同名文件时应先备份。
- `pkill redsocks` 会停止机器上的全部 `redsocks` 进程，不适合与其他 redsocks 服务共用。
- WARP 出口地区由 Cloudflare 网络分配，脚本不能保证固定国家或地区。
- 原页面标注“代码完全开源”，但未提供明确的 LICENSE；本站备份保留了原作者署名和来源。

## 参考资料

- [原作者配套文章](https://vpszdm.com/warp1/)
- [Cloudflare WARP Linux 安装文档](https://developers.cloudflare.com/warp-client/get-started/linux/)
- [Cloudflare WARP modes 与 Local proxy](https://developers.cloudflare.com/warp-client/warp-modes/)
- [Cloudflare WARP Linux 软件包仓库](https://pkg.cloudflareclient.com/)
- [Google 用户服务 IP 段](https://www.gstatic.com/ipranges/goog.json)
