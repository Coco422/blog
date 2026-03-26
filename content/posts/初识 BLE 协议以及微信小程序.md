---
title: 初识 BLE 协议以及微信小程序
description: 手头有个项目，涉及到 app 端蓝牙连接。硬件开发伙伴给到了 BLE 协议，完全一头雾水 最近忙的没空推进 Go 的学习，想着博客至少不能落下更新，不管怎么样也要逼自己写一篇水文。 什么是 BLE 首先得知道什么是蓝牙（Blue
date: 2026-01-19T11:36:17+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-01-19T14:06:12+08:00
showLastMod: true
tags:
  - bluetooth
  - protocol
categories:
  - 什么是什么
  - 杂技浅尝
---
> 手头有个项目，涉及到 app 端蓝牙连接。硬件开发伙伴给到了 BLE 协议，完全一头雾水
> 
> 最近忙的没空推进 Go 的学习，想着博客至少不能落下更新，不管怎么样也要逼自己写一篇水文。

## 什么是 BLE

### 首先得知道什么是蓝牙（Bluetooth）

> 小时候肯定有人好奇为什么要叫 Bluetooth，无奈好奇心还不够，只停留在发起 why，今天才是真的解惑。
> 
> 不出意外是和人名有关，他是**Harald Bluetooth（哈拉尔德·蓝牙王）** 他是丹麦国王，功绩差不多是统一了分裂的丹麦与挪威。90 年代蓝牙技术的研发小组以其名号期许新技术能集成各大资通品牌的标准。蓝牙的 logo 也是如此 卢恩字母 （Hagall，ᚼ）和 （Bjarkan，ᛒ）的组合，也就是Harald Blåtand的首字母HB的合写。

蓝牙技术规范由蓝牙技术联盟 (Bluetooth Special Interest Group, SIG) 制定，版本现如今已经更新到 第六代了

其中第四代开始，支持了本文的主角，也就是**蓝牙低功耗 (Bluetooth Low Energy, BLE)**

>目前蓝牙最为普遍使用的有两种规格：
>
>蓝牙基础率/增强数据率 (Bluetooth Basic Rate/Enhanced Data Rate, BR/EDR): 也称为经典蓝牙。常用在对数据传输带宽有一定要求的场景上，比如需要传输音频数据的蓝牙音箱、蓝牙耳机等；
>
>蓝牙低功耗 (Bluetooth Low Energy, BLE): 从蓝牙 4.0 起支持的协议，特点就是功耗极低、传输速度更快，常用在对续航要求较高且只需小数据量传输的各种智能电子产品中，比如智能穿戴设备、智能家电、传感器等，应用场景广泛。

### BLE 大概是什么

大概分成三个核心维度来了解 BLE：架构（Stack）、连接机制（GAP-Generic Access Profile） 和 数据交互（GATT-Generic Attribute Profile）。

## BLE 的分层架构 (Protocol Stack)

BLE 协议栈主要分为两大部分：控制器 (Controller) 和 主机 (Host)。

- Controller (底层): 负责无线电信号的发送、接收和时序控制。它直接处理硬件。
- Host (上层): 运行在主控 MCU 上，负责逻辑处理、数据封装和应用层接口。
- HCI (接口): 两者之间的沟通桥梁。

其中 Host 层中以下两层是开发时常见的

- **GAP (Generic Access Profile):** 负责“如何让别人发现我”或“如何连接别人”。
- **GATT (Generic Attribute Profile):** 负责“连接后如何传输数据”。

这个架构分层前期接触搞不太明白，先学会应用不用明白原理
只用知道 需要先建立连接 -> 才能传输数据， 这两步分别用到刚刚的两个规范

## 发现和连接 GAP (Generic Access Profile)

GAP 定义了设备在网络中的角色以及它们如何建立连接。这里有两个关键概念：**广播 (Advertising)** 和 **角色**。

#### 四种主要角色

1. **Broadcaster (广播者):** 只发广播，不建立连接（例如：温湿度计、Beacon 信标）。
2. **Observer (观察者):** 只扫描广播，不建立连接（例如：网关）。
3. **Peripheral (外围设备):** 发送广播，允许被连接（例如：智能手环）。这是最常见的从机角色。
4. **Central (中心设备):** 扫描广播，发起连接（例如：手机）。这是最常见的主机角色。

在我遇到的应用需求中。我们的微信小程序所在的手机作为 Central，硬件设备是一个数字钥匙，作为 Peripheral。

具体的连接流程如下

 1. **外设周期性发送广播包**
	广播包里会包含：

- 自己的名字（Device Name）
- MAC 地址
- 支持的服务 UUID
- 可能还有一点点数据（最多 31 字节）

2. **手机扫描（Scanning）**

- 手机（Central）在蓝牙信道上**监听广播**。
- 一旦发现目标设备，就可以发起连接请求。

3. **建立连接（Connecting）**

- 手机 → 设备：发送连接请求
- 设备 → 手机：回应并建立 GATT 连接  

这时候双方就有了一个“逻辑通道”，后续可以读/写/通知数据了。
交换数据就用到了另一个规范。

## 数据交互：GATT (Generic Attribute Profile)

建立连接之后就可以发送数据了
GATT 也采用的  C/S 架构，但是和我们开发 Web 的 C/S 架构方向上不太一样，此时 外围设备是 Server，我们的 中心设备是 Client

> [!tip]  
> 接下来文章中多次会举例，我会直接默认手机为中心设备，设备/手环 为外围设备

### 相关概念

根据GATT (Generic Attribute Profile) 规范可以定义出一个个配置文件 (Profile)，描述该蓝牙设备提供的服务 (Service)。

- **配置文件 (Profile)**: Profile 是被蓝牙标准预先定义的一些 Service 的集合，并不真实存在于蓝牙设备中。如果蓝牙设备之间要相互兼容，它们只要支持相同的 Profile 即可。一个蓝牙设备可以支持多个 Profile。
- **服务 (Service)**: Service 是蓝牙设备对外提供的服务，一个设备可以提供多个服务，比如电量信息服务、系统信息服务等。每个服务由一个 UUID 唯一标识。
- **特征 (Characteristic)**: 每个 Service 包含 0 至多个 Characteristic。比如，
	- 电量信息服务就会有个 Characteristic 表示电量数据。
	- Characteristic 包含一个`值 (value)` 和 `0 至多个描述符 (Descriptor)` 组成。
	- **在与蓝牙设备通信时，主要就是通过读写 Characteristic 的 value 完成。**
	- 每个 Characteristic 由一个 UUID 唯一标识。
- **描述符 (Descriptor)**: Descriptor 是描述特征值的已定义属性。例如，Descriptor 可指定人类可读的描述、特征值的取值范围或特定于特征值的度量单位。每个 Descriptor 由一个 UUID 唯一标识。

> [!info] 
>**通知（Notify）的概念** 
>
>在 BLE 中，手机（Client）通常不会一直轮询（Polling）手环（Server）来查电量。而是手环在电量变化时，主动“推”数据给手机。这种机制叫 **Notify** 或 **Indicate**，是 BLE 省电的关键。

#### BLE 中的 UUID

UUID (Universally Unique Identifier)
根据蓝牙 4.2 协议规范(Vol 3, Part B, section 2.5.1 UUID)，UUID 是一个 128 位的唯一标识符，用来标识 Service 和 Characteristic 等。

为了减少存储和传输 128 位 UUID 值的负担，蓝牙技术联盟预分配了一批 UUID，这一批 UUID 拥有一个共同部分，被称为 Bluetooth Base UUID，即 00000000-0000-1000-8000-00805F9B34FB。因此，预分配的 UUID 也可以使用 16 位或 32 位表示，其中 16 位 UUID 最为常用。使用 16/32 位的 UUID 可以降低存储和传输的负载。开发者自定义的 UUID 应注意不能与预分配的 UUID 冲突。

## 举个🌰

要开发一个“智能灯泡”：

1. **定义角色 (GAP):** 灯泡是 **Peripheral**（外围设备），手机是 **Central**（中心设备）。
2. **设计广播:** 灯泡上电后发送广播包，包含名字“Smart Light”。
3. **设计数据 (GATT):**
    - 创建一个 **Service** (自定义 UUID)。
    - 在下面创建一个 **Characteristic** 用于控制开关（支持 Write 属性）。
    - 再创建一个 **Characteristic** 用于反馈亮度（支持 Read 和 Notify 属性）。
4. **交互:** 手机扫描到“Smart Light” -> 连接 -> 手机往“开关特征值”写入 `0x01` -> 灯泡亮起。

## 微信小程序

原本想记录微信小程序的过程。后发现官方文档的内容足以，就不多赘述了，当了解了上面的概念之后，就能看懂官方文档，写小程序来实现蓝牙已经不复杂了

## 参考文章

感谢 gemini 和 gpt 两位 G 老师

- [Bluetooth Low Energy - Wikipedia](https://en.wikipedia.org/wiki/Bluetooth_Low_Energy#)
- [Bluetooth - Wikipedia](https://en.wikipedia.org/wiki/Bluetooth)
- [连接硬件能力 / 蓝牙 / 介绍](https://developers.weixin.qq.com/miniprogram/dev/framework/device/bluetooth.html)
- [经典蓝牙与低功耗蓝牙BLE开发基础知识：服务、特征、属性、UUID-云社区-华为云](https://bbs.huaweicloud.com/blogs/354107)

另外调试过程中有两个手机 app 挺有帮助

1. BLE调试助手，南京沁恒开发的app
2. nRF Connect，Nordic官方开发（这个全英文用起来有点难度，上面那个比较简单，但是功能感觉不够多，作为从机而言）

公司有一块闲置的树莓派 3B，看了下支持 蓝牙 4.1 ，刷回官方系统回头看看能不能拿来当调试工具

