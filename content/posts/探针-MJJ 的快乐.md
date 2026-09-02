---
title: 探针——MJJ 的快乐
description: 用 CF-Server-Monitor 把服务器监控面板托管到 Cloudflare，不再额外养一台主控，只保留轻量的单向上报探针。
date: 2026-09-02T02:10:41+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-09-02T12:11:43+08:00
showLastMod: true
tags:
  - Cloudflare
  - 服务器监控
  - VPS
  - CF-Server-Monitor
categories:
  - 杂技浅尝
---
![image.png|300](https://imgbed.szmckj.cn/uploads/2026/09/02/6a97a0edacd05.png)

> 最近好多个 oneman 云的灵车都死光光了，剩下这几个都是 3-8$左右的月付

MJJ 的快乐其实很朴素。

服务器买回来，不一定真有什么业务，但是最好整整齐齐摆在一个面板里。看它们全绿，看 CPU、内存和流量轻轻跳动，就很舒服。[Doge]

我以前也用过哪吒、Beszel 之类的监控面板。功能都不少，问题是它们通常还要先找一台服务器当主控。为了看其他服务器活没活，我得先养一台专门负责「看服务器」的服务器，多少有点套娃。

另外我对主控和 Agent 之间长期保持通信这件事一直有点心里没底。未必真的不安全，但只要各台机器还需要给主控留一个可达入口，我就容易多想。

我的需求其实没那么复杂：

- 机器还活着没有
- CPU、内存、磁盘大概用了多少
- 当前网速和累计流量
- 延迟、丢包有没有突然抽风
- VPS 什么时候到期

告警、自动化运维、远程执行命令这些暂时都不是刚需。能看，够轻，界面顺眼，就可以了。

然后我找到了 [CF-Server-Monitor](https://github.com/huilang-me/CF-Server-Monitor)。

## 主控直接扔给 Cloudflare

这个项目把面板、API 和数据存储都放到了 Cloudflare：

```text
服务器上的 Agent
        │
        │ HTTPS / WSS 单向上报
        ▼
Cloudflare Worker
        ├── D1 保存服务器和历史数据
        ├── Durable Objects 做实时推送
        └── 静态资源提供监控面板
```

也就是说，我不需要再拿一台 VPS 跑主控，不用额外维护数据库、反代和主控进程。Agent 主动往 Cloudflare 上报，服务器本身也不用为了监控再开放一个入站端口。

单向上报不等于绝对安全，`API_SECRET` 还是得好好保存，后台也得换强密码。但从我的使用习惯来说，这种结构明显更省心。

Cloudflare 这一侧用到 Worker、D1 和 Durable Objects。项目本身就是按免费额度设计的，少量个人服务器先拿来玩完全够用。真把上报频率拉得很高、机器数量堆得很多，还是要自己盯一下 Cloudflare 的用量。

## 部署大概就是这些

仓库提供了 Cloudflare 一键部署，也可以直接用 Wrangler。我的做法是先创建 D1，再构建并部署 Worker：

```bash
npm install
npm run build:frontend
npx wrangler d1 create server-monitor-db
npx wrangler deploy
```

D1 创建完成后，需要把返回的 `database_id` 写进 `wrangler.toml`。然后再设置一个随机的 `API_SECRET`：

```bash
openssl rand -hex 32 | npx wrangler secret put API_SECRET
```

这里不要把真实 Secret 写进仓库，记得用强密码。

最后给 Worker 绑定一个自己的子域名，例如：

```text
monitor.example.com
```

Cloudflare 端就差不多了。没有 docker compose，没有数据库容器，也没有「主控机挂了以后我该去哪看主控机」这种哲学问题。

## 探针更简单

后台新增一台服务器后，会生成独立的 Server ID 和安装命令。脱敏以后大概长这样：

```bash
curl -fsSL https://raw.githubusercontent.com/huilang-me/cfsm-agent/main/install.sh \
  | sh -s -- install \
      -id=<SERVER_ID> \
      -secret=<API_SECRET> \
      -url=https://monitor.example.com/update \
      -auto_update=0
```

Linux 上安装后是一个 `cf-probe` systemd 服务，常用检查命令也就两个：

```bash
systemctl status cf-probe
journalctl -u cf-probe -f
```

看到 WSS connected，回面板刷新一下，机器就出现了。

可以，成功了。

## 最后的效果

![CF-Server-Monitor 多服务器监控面板效果](https://imgbed.szmckj.cn/uploads/2026/09/02/6a9715091fe99.png)

这个界面其实也能换肤，但是懒得弄了，现在这个还行。深色终端风格，服务器可以按地区和分组展示，CPU、RAM、磁盘、网速、总流量、月流量、价格和到期时间都有，当然 后面几个信息自己配置的。延迟和丢包也不是只放一个数字，而是直接给一排小色块，看着很直观。

条形图、环形图、列表和地图几种视图都能切。中英文、亮暗主题也有。至少在「现代」「好看」「打开就知道机器有没有死」这几个需求上，已经完全满足我了。

现在没有打算把它变成多复杂的监控系统。资源告警、通知渠道、主题这些功能以后有需要再配。先把手里的 VPS 一个个挂上去，看着一排绿色在线状态就已经很快乐。

也许，我是末法时代入门的垃圾佬吧