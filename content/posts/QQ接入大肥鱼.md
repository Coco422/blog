---
title: QQ接入大肥鱼
description: ""
date: 2026-10-28T22:01:03+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-10-28T23:58:17+08:00
showLastMod: true
tags:
  - 大肥鱼
categories:
  - 杂技浅尝
---
>倒是已经对这些失去了太多兴趣，但是由于（拖更使然）我还是抽时间敷衍一下自己，哈哈哈。

那么， 最近大肥鱼泛滥。首先，什么是大肥鱼，那当然是我们可爱的DeepSeek，由于其强劲（中不溜）的性能和极致的低价（谷价勉强算），易用性，还有它配套的DSH广泛的扩展性，网友们玩出了各种各样的花样，并且由于DeepSeek logo 鲸鱼形象被网友们二创成女仆装鲸鱼娘，非常讨喜，让程序员心爱不已，于是有人做出 “大肥鱼”人格（角色设定），再配合各种工具接入到 B站、QQ、等各种场合，于是出现了大肥鱼泛滥的情况。

那么如年初一样，养龙虾的时代来到了养大肥鱼的时代，如果你要配置大肥鱼，我这里有一份极简小连招。

> 本次教程使用 windows+DSH+官方模型+QQ bridge 等作为示范。
## 安装DSH

DSH（DeepSeek harness）

![image.png|300](https://imgbed.szmckj.cn/uploads/2026/10/28/6ae21a66bffe3.png)

直接来到官网下载安装即可，接下来你的大肥鱼就会住在这里。如果你能找到个不关机的电脑（服务器），你也可以让它住在那里，24小时响应你的需求。

## 连接 QQ

我这里用的是

Derpyu520/qq-bridge（Stars 挺高 截止本文3.2k，社交仿真“群友”模式很强，人格卡、状态机、表情、记忆，适合想让鱼更像真人混群的）

要用这个需要先安装 showluma

下载启动后控制台会输出密码

![image.png|300](https://imgbed.szmckj.cn/uploads/2026/10/28/6ae21a7e078e6.png)

在该页面填写密码后，会要求修改密码，之后就可以成功进入页面。
此时我系统登录着我的QQ小号，他检测到了进程，于是我点击注入进程

这个系统很适合你在Linux下安装部署并且扫码登录Linux QQ，如果有小伙伴需要的话可以留言，我也带着过一遍哦。

### SnowLuma 这边要开的两个服务

进 WebUI（`http://127.0.0.1:5099`，以启动日志实际打印的为准）→ OneBot 配置，开两个：

- **HTTP API**：默认 `127.0.0.1:3000`
- **WebSocket 服务端**：默认 `127.0.0.1:3001`

两条各自带一个 `accessToken`。点击编辑后查看，也可以在目录里直接查看

```
<SnowLuma 解压目录>\config\onebot_<机器人QQ号>.json
```

里面有 `networks.httpServers[0]`（HTTP，3000）和 `networks.wsServers[0]`（WebSocket，3001）。

> ⚠️ **坑：HTTP token 和 WS token 不是同一个值。** 同一个 QQ 号，3000 和 3001 是两套独立 server，各自的 `accessToken` 不一样。而 `config.json` 的 `snowluma.accessToken` 只能填一个，要填 **HTTP 那条**（桥接挂给 AI 的工具发送、查群、查消息全走 HTTP）。
>
> 于是桥接启动时**必然先失败一次**：拿 HTTP token 去连 WS → `SnowLuma 连接断开（code=1006）` → 触发 token 自愈（去 `<homeDir>\config\onebot_<机器人QQ号>.json` 读 `networks.wsServers[0].accessToken`）→ 用真正的 WS token 重连 → `SnowLuma 已连接`。
>
> **所以「先报一次 1006，再报已连接」是正常启动流程，不是装坏了。** 看到 1006 就以为失败、反复重装重配，是最常见的白折腾。
>
> 真正的故障长得完全不一样：日志里出现 **`token 自愈失败`**，并且 QQ 侧完全收不到任何消息 —— 那才是 `snowluma.homeDir` 没指对，或者读不到那个 `onebot_<QQ号>.json`。
>
> 不想看这一次 1006 也可以：在 WebUI 里把 HTTP 和 WebSocket 两端的 `accessToken` 改成**同一个值**，再填进 `config.json`，就没有这段自愈了。



### qq-bridge config.json 里其余要填的项

启动之前我对`config.json` 的 `dsh.baseUrl`更改，模板默认是3080，我的是1114端口

剩下这些值全部来自 SnowLuma 那边取，不在 qq-bridge 里：

| 配置项                              | 从哪拿                                                            | 填到哪                    |
| -------------------------------- | -------------------------------------------------------------- | ---------------------- |
| `snowluma.httpUrl`               | WebUI → OneBot → HTTP API 的 host + port（默认 3000），前面补 `http://` | `snowluma.httpUrl`     |
| `snowluma.wsUrl`                 | 同页 → WebSocket 服务端的 host + port（默认 3001），前面补 `ws://`           | `snowluma.wsUrl`       |
| `snowluma.accessToken`           | 同页里 **HTTP 那条**的 accessToken（为什么不是 WS 那条见上一节）                  | `snowluma.accessToken` |
| `snowluma.homeDir`               | SnowLuma 解压出来的目录，也就是 `launcher.bat` 所在目录                       | `snowluma.homeDir`     |
| `ownerQQ`                        | **你自己的 QQ 号**（不是机器人小号），管理命令/审批/封闭模式靠它认人                        | `ownerQQ`，或控制台「访问与安全」页 |
| `allow.private` / `allow.groups` | 允许哪些好友、哪些群跟机器人说话；号在 QQ 客户端的群设置里看                               | 建议直接在控制台「访问与安全」页填      |

> ⚠️ 白名单 `allow.private` / `allow.groups` 默认是**空数组**、`allowAllWhenEmpty` 默认 `false` —— 白名单空着就**一条消息都不回**。这是刻意的 fail-closed 默认值，不是没装好。

不用动的几项：

- `dsh.authToken`：**保持空**。新版 DSH 的进程 token 只在内存里，桥接会用 `~/.dsh/.credentials.yaml` 里持久化的签名密钥离线铸造会话 Cookie，填了反而容易 401。
- `consoleToken`：留空，首次启动自动生成，完整值落在 `state/console-token`。
- `dsh.provider` / `dsh.model` / `dsh.reasoningEffort`：照 DSH 设置页里实际有的模型填，选不中只打日志、不阻塞启动。

之后就启动 qq-bridge，进入仓库位置双击 start.bat（守护、崩了自动重启）或者

```
npm start
```

启动日志里会有这么一行，就是首次进页面要填的东西：

```
[bridge] 控制台未配置 consoleToken，已自动生成：954bf5…（完整值保存在 state/console-token）
```

完整令牌在这里：

```
 .\state\console-token
```

浏览器打开 `http://127.0.0.1:3100/` → 粘贴令牌 → 进控制台。

![image.png|300](https://imgbed.szmckj.cn/uploads/2026/10/28/6ae21b05eab47.png)


不要头疼怎么安装的问题，你刚刚已经下载了DSH了，这些直接叫他帮你安装就行了。

## 配置人格

这是最重要的一步，给你的大肥鱼装入灵魂，来到左侧的 人格与角色，可以看到系统已经默认带了一个 小鲸鱼人格和傲娇助手人格

![image.png|300](https://imgbed.szmckj.cn/uploads/2026/10/28/6ae21b5d0c135.png)

选择后点击保存并在下面设置。

### 最后一步白名单

然后来到访问与安全。在白名单里输入允许的群和允许的QQ号，点击保存，此时来到群里开始发消息，

![de06ceb5827c5a26cb59808196b4b6a2_720.png|300](https://imgbed.szmckj.cn/uploads/2026/10/29/6ae21c042aa48.png)

这里我打完招呼后，想让他给我新开的88dog中转站做些广告，结果这大肥鱼尽惹我生气了。

除此之外，大肥鱼还能发表情包，发语音等。这些多亏了 QQ-bridge项目，感谢开源大佬们的贡献，让我们方便愉快的玩上大肥鱼，先睡了，明天找个服务器安置一下大肥鱼。

