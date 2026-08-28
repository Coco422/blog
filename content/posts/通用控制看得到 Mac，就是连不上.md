---
title: "通用控制看得到 Mac，就是连不上：两台 Codex 排查 IDS 注册故障"
description: 两台 Mac 的通用控制无线发现正常却始终无法连接，最后通过双机日志对照定位到 IDS 身份未注册，并用登录 iMessage 完成修复。
date: 2026-08-28T15:55:45+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-08-28T16:10:35+08:00
showLastMod: true
tags:
  - macOS
  - Universal Control
  - IDS
  - Codex
categories:
  - 杂技浅尝
---

我的 Mac mini 和 MacBook Air 明明登录着同一个 Apple Account，也在同一个局域网里，Wi-Fi、蓝牙、Handoff 全都开着，但是鼠标推到屏幕边缘就是没反应。

不是偶尔抽风，是始终连不上。

一开始我以为又是显示器布局、推边方向或者 Universal Control 的开关没落盘。结果两台 Mac 来回查了一圈，最后真正修好的动作特别简单：**在故障的 Mac mini 上登录 iMessage。**

登录后，Universal Control 几乎立刻恢复。

但这篇不是为了记“登录一下 iMessage 就好了”这种玄学偏方。真正有意思的是，我们把修复前后的日志和 IDS 状态对上了：Mac mini 原本没有生成可用的 IDS 已注册身份，登录 iMessage 后，这个身份才真正出现。

## 两台 Mac 上的 Codex，靠一个留言板对账

这次排查还有点特别。

两台 Mac 上各跑了一个 Codex，各自检查本机的设置、状态和日志。为了让它们能持续交换结果，其中一台临时搭了一个局域网留言板。Mac mini 端把检查结果贴上去，MacBook Air 端读取后继续对照，再把新的判断贴回来。

有点像两个人隔着一张桌子排障，只不过桌上摆的是日志，交流靠留言板。

![两台 Mac 上的 Codex 通过局域网留言板同步 Universal Control 排查结果](https://imgbed.szmckj.cn/uploads/2026/08/28/6a913ed9bdc61.png)

这个方式在双机问题上还挺合适。因为很多日志单看一台机器都很吵，只有把正常端和故障端放在同一个时间窗口里比较，真正有区分度的东西才会冒出来。

## 先把连接过程拆开

Universal Control 不是“蓝牙发现设备，然后鼠标就能穿过去”这么简单。为了避免一直在错误的地方折腾，我们先把过程粗略拆成四层：

```text
1. 无线发现
   BLE / Wi-Fi P2P / AWDL 能不能看到附近设备

2. IDS 身份映射
   能不能把匿名广播映射成同一 Apple Account 下的可信设备

3. Universal Control 目标注册
   有没有 Magic Edge、Hot Zone、Target Ready、IDS Target

4. 认证与建链
   有没有进入授权、RemoteDisplay 和 link establishment
```

鼠标推边已经是第 3 层附近的事情了。如果第 2 层身份映射就失败，不管从左边推还是右边推、显示器怎么摆，都不会凭空多出一个可连接目标。

所以先不推了，抓日志。

## 无线发现其实一直是正常的

两端在同一个时间窗口里观察这些进程：

- `UniversalControl`
- `rapportd`
- `sharingd`
- 后来又补了 `identityservicesd`

过滤日志可以用：

```zsh
/usr/bin/log stream \
  --style compact \
  --info \
  --debug \
  --predicate 'process == "UniversalControl" OR process == "rapportd" OR process == "sharingd"' \
| rg --line-buffered -i \
  'universal control|magic.?edge|hot.?zone|target|remote.?display|ids|identity|auth|connect|link|decrypt|no model'
```

抓取期间，我在主控 Mac 上分别向整套显示器布局的最左和最右边缘持续推鼠标。内部显示器接缝不算，免得又把布局问题混进来。

结果两台 Mac 都能持续收到近距离的 BLE / Wi-Fi P2P 广播，信号也正常，还能看到 `PeerMe`、`Ranging` 之类的特征。

也就是说，它们并不是互相看不见。

但日志里同时出现了另外两条东西：

```text
sharingd:
Unable to decrypt activity level with authTag yes identity no

rapportd:
Ignoring BLE device found with no model
```

更关键的是，Universal Control 日志里始终没有出现：

- Magic Edge
- Hot Zone
- Target Ready
- IDS Target
- 认证成功
- link establishment

这就比较明确了：无线层发现了设备，但 `sharingd` 没有可用的身份去解密和识别广播，`rapportd` 只能把对面当成一个没有型号、没有 IDS 身份的 Generic 设备，然后忽略掉。

问题卡在无线发现之后、Universal Control 目标注册之前。

## 决定性差异：IDS 已注册身份是空的

接下来两边只读了两个状态位：

```zsh
ids_pref="$HOME/Library/Preferences/com.apple.identityservicesd.plist"

plutil -extract hasRegIdentityContainer raw -o - "$ids_pref"
plutil -extract hasUnregIdentityContainer raw -o - "$ids_pref"
```

对比结果很干净：

| 状态 | 正常的 MacBook Air | 故障时的 Mac mini |
| --- | ---: | ---: |
| `hasRegIdentityContainer` | 1 | 0 |
| `hasUnregIdentityContainer` | 1 | 1 |
| IDS Loaded accounts | 有 | 0 |
| Last registered | 有注册状态 | null |
| Recent Registrations | 有历史 | 0 |

Mac mini 的 `identityservicesd` 还在反复输出：

```text
Active device uniqueID: (null)
registeredAccount: (null)
No registered account for service
```

这比“系统设置里登录了同一个 Apple Account”更接近问题本身。

系统账户是有的，但 IDS 没有加载到一个已注册、可以拿来识别设备的服务账户。无线广播到了这里，就像快递已经送到小区门口，但系统里查不到收件人，当然没法继续送。

## 中间几个误判

### 空 plist 不代表开关没开

排查早期，Mac mini 的 Universal Control 偏好文件是空字典，而 Air 端已经有 `Configuration`。我们一度以为 Mac mini 的“允许指针和键盘在附近 Mac 或 iPad 之间移动”没有真正开启。

后来我直接看了系统设置截图，三个开关全开着。

这个判断当场作废。

私有 plist 的字段和落盘时机可能跟 macOS 版本有关。文件里没看到字段，只能说明“这里没看到”，不能反过来替 UI 作证。

### 看起来很凶的 attestation 日志也可能只是噪声

Mac mini 上还出现过证书信息获取失败和 attestation 缺失。乍一看很像根因，但正常的 Air 在已经拥有注册身份的情况下，也有不少同类日志。

所以它至少不是这次最有区分度的证据。

双机对照的价值就在这里：不是挑最吓人的 error，而是找两边真正不一样的状态。

### 重启服务没有用

我们重启过这些用户态服务：

- `identityservicesd`
- `rapportd`
- `sharingd`
- `UniversalControl`

它们都被 `launchd` 正常拉了起来，但 `hasRegIdentityContainer` 还是 `0`。

关闭再开启 Handoff 也没有触发 IDS 注册。

数据库本身只读检查是正常的，`quick_check` 返回 `ok`，只是关键表里压根没有生成过账户、设备身份和注册事件。服务重启多少次，加载回来的还是一份完整但空空的数据。

## 最后一个差异在 Messages

继续对比非敏感的账户服务状态，终于又看到一个明显差异：

| 服务状态 | MacBook Air | 故障时的 Mac mini |
| --- | ---: | ---: |
| Messages | Enabled | Disabled |
| Phone / FaceTime | Enabled | 未注册或缺失 |
| iCloud Keychain | Enabled | Enabled |

而 Apple 的公开说明只要求两台设备登录同一 Apple Account，并启用双重认证、Wi-Fi、蓝牙、Handoff 等条件，并没有把 Messages 列成通用前置条件。

Codex 提到两个可能的修复动作：

1. 在 Messages App 中登录 iMessage，建立 iMessage / IDS 服务身份；
2. 在 iCloud 设置中打开 Messages 同步，决定消息内容是否通过 iCloud 同步。

我执行的是第一个。

## 登录 iMessage，立刻恢复

我在 Mac mini 的 Messages App 中登录 Apple Account，完成 iMessage 登录。

然后 Universal Control 几乎立刻恢复，Mac mini 可以正常控制 MacBook Air。

再看状态：

```text
hasRegIdentityContainer:   0 → 1
hasUnregIdentityContainer: 1 → 0
```
此前缺失的 IDS 已注册身份确实被生成了，随后 Continuity 广播能够映射成可信设备，Universal Control 也终于拿到了目标。

完整链路大概是：

```text
登录 iMessage
  → 本机生成 IDS 已注册身份
  → Continuity 广播映射成可信设备
  → Universal Control 获得目标
  → 认证和链路建立
```

可以，成功了。

## 感叹 AI

不得不感慨，AI 的发展实在是让现在所有的教程、问题解决方案变得越来越廉价了。
所以这也是我疯狂地在沉淀这方面的知识，并且加大输入，然后转化为我的输出。

那就先这样，收工。

## 参考资料

- [Universal Control: Use a single keyboard and mouse between Mac and iPad — Apple Support](https://support.apple.com/en-euro/102459)
- [Set up iCloud for Messages on all your devices — Apple Support](https://support.apple.com/en-euro/guide/icloud/mm0de0d4528d/icloud)
