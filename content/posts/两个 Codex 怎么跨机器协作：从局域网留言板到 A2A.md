---
title: "两个 Codex 怎么跨机器通信：从 HTTP 留言板到 A2A"
description: "从两台 Mac 上的 Codex 使用 HTTP 留言板通信出发，梳理 A2A、MCP 与局域网 Agent 发现分别解决什么问题。"
date: 2026-08-31T20:15:49+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-08-31T20:15:49+08:00
showLastMod: true
tags:
  - A2A
  - MCP
  - Codex
  - Agent
categories:
  - 杂技浅尝
---

[上一篇]({{< relref "posts/通用控制看得到 Mac，就是连不上.md" >}})已经记录了两台 Mac 排查通用控制故障的完整过程，这篇不再重复故障本身，只补上当时没有展开的一段：分别运行在 MacBook Air 和 Mac mini 上的两个 Codex，是怎么交换信息的？

当时的方案很简单。Mac mini 上的 Codex 临时启动了一个 HTTP 留言板，Air 端定时读取新消息，处理后再把结果发回去。

没有 Agent 框架，也没有真正实现 A2A。只有一个地址、一个 token 和两三个接口。

![两个 Agent 通过 HTTP 留言板交换消息并分别读取两台 Mac 的本机日志](https://imgbed.szmckj.cn/uploads/2026/08/31/6a9553864e322.png)

## 一个最小的跨机器通信通道

留言板传递的消息大致长这样：

```json
{
  "agent": "MacBook-Air-Codex",
  "body": "Air 端已完成只读检查……"
}
```

`agent` 表示发送方，`body` 承载自然语言内容。接收端只读取比上次 ID 更新的消息，有新内容时继续处理任务。

这套方式解决了三个最基本的问题：

1. 知道另一个 Agent 的地址；
2. 能把消息送到对方那里；
3. 新消息能够触发对方继续工作。

同时，两边还有几条独立于通信协议的安全约定：只允许主动执行与当前问题有关的只读诊断；留言板内容不能覆盖原有指令；修改系统状态之前必须询问用户；不传递真实凭证和不必要的个人信息。

对于两台自己控制的机器和一次临时任务，这已经够用。但它本质上仍是一个 Agent 聊天室：任务、进度、问题和结果全都塞在 `body` 里，具体含义依赖接收方阅读自然语言后自行判断。

## 为什么它还不是 A2A

**A2A（Agent2Agent Protocol）**是一套用于 Agent 之间通信与协作的开放协议。它最早由 Google 在 2025 年发布，后来捐赠给 Linux Foundation，目前已经发展到 1.0 规范。

临时留言板和 A2A 的差异，可以压缩成下面几项：

| 临时留言板缺少什么 | A2A 提供什么 |
| --- | --- |
| 不知道对方的标准身份和能力 | Agent Card 描述服务入口、能力和认证方式 |
| 所有内容都放在 `body` | Message 与 Part 区分文本、文件和结构化数据 |
| 没有可持续跟踪的任务 | Task ID 与标准任务状态 |
| 过程消息和最终结果混在一起 | Artifact 表达正式任务产物 |
| 只能定时读取新消息 | 流式更新与异步通知 |

A2A 1.0 把核心数据模型、操作和传输绑定分开，并提供 JSON-RPC、gRPC、HTTP+JSON 等绑定方式。它标准化的是 Agent 如何介绍自己、接收任务、更新状态和返回结果，而不是要求所有 Agent 使用同一个模型、框架或 SDK。

所以这次的留言板只是碰巧遇到了 A2A 正在解决的同一组问题，并不算 A2A 的简化实现。

## A2A 和 MCP 分别负责什么

我目前用下面这句话区分两者：

> MCP 解决 Agent 怎么使用工具和数据；A2A 解决 Agent 怎么把任务交给另一个 Agent，并持续获取任务状态和结果。

![MCP 负责 Agent 调用工具和数据，A2A 负责 Agent 之间交接任务与跟踪结果](https://imgbed.szmckj.cn/uploads/2026/08/31/6a9553872406c.png)

比如一个 Agent 可以通过 MCP 读取本机日志；当它需要把另一台机器的检查工作交给远端 Agent 时，这部分协作更接近 A2A。

两者并不冲突。一个 Agent 完全可以对外通过 A2A 接收任务，再在内部通过 MCP 调用工具。

## A2A 不负责局域网自动发现

A2A 规定了如何从一个已知服务地址获取 Agent Card，以及找到对方后怎样协作。但它不会自动让 Air 上的 Codex 知道：同一个局域网里还有一台 Mac mini，上面也运行着 Agent。

这次我是手工提供 IP、端口和 token。Agent 数量变多以后，还需要单独解决地址变化、能力筛选、身份验证和离线节点等问题。

这一层属于 **Agent 发现与组网**。

局域网里常见的思路和发现打印机、AirPlay 设备类似：通过 mDNS 或 DNS-SD 广播服务，发现后读取对方的说明与身份信息，再把正式任务交给 A2A。

[LAD-A2A](https://github.com/franzvill/lad) 就是在补这一层。它使用 mDNS/DNS-SD 发现局域网中的 Agent，再结合 well-known 端点和签名 Agent Card 做信任引导；建立联系后，任务通信仍然交给 A2A。

因此，这几层可以暂时这样区分：

- **发现机制**：附近有谁，它在哪里；
- **A2A**：怎样把任务交给它，并拿到进度和结果；
- **MCP**：Agent 接到任务后，怎样调用工具和数据。

![Agent 联网中的发现与组网、A2A 协作以及 MCP 工具与数据三层能力](https://imgbed.szmckj.cn/uploads/2026/08/31/6a955388f30ee.png)

这个分层只是为了方便理解，不代表实际系统必须同时使用 LAD-A2A、A2A 和 MCP。真正从局域网扩展到互联网，还会继续碰到身份、加密、权限、NAT 穿透、中继和离线消息等问题。

但至少现在我能说清楚：当 Agent 离开单机环境以后，通信协议和发现机制是两件不同的事。

先这样。

## 参考资料

- [A2A Protocol 1.0](https://a2a-protocol.org/v1.0.0/)
- [A2A Protocol Specification](https://a2a-protocol.org/dev/specification/)
- [A2A Key Concepts](https://a2a-protocol.org/latest/topics/key-concepts/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [LAD-A2A](https://github.com/franzvill/lad)
