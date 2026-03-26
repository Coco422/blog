---
title: R2S复活记
description: 作者分享R2S路由器复活经历，从固件升级到iStoreOS，安装passwall2，解决魔法失效问题。通过配置旁路由DHCP服务，实现设备自动分流，普通设备走主路由，需要魔法的设备自动指向R2S，解决了网络切换配置失效的困扰。
date: 2026-03-25T23:25:22+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-03-26T11:30:56+08:00
showLastMod: true
tags:
  - network
categories:
  - 杂技浅尝
---
> [!info] 
> 成为魔法师已经不知道多少年、为了魔法，年少无知的深夜不知多少次抓耳挠腮
> 某一天、某论坛、刷到一个路由器的推荐：H3CNX30pro，至今为止我都能背出型号，实在是第一个折腾的给到的印象太深。当时给到的教程配套了刷机教程，刷了 immortalwrt，一个裁剪后的 openwrt，虽然功能不多，但是核心功能已有，让我体验了丝滑的上网体验，但是如果家中只有这一台路由器，当魔法失效时，全家的网都会崩溃。
> 随后在前辈的指引下，他给了我一台 R2S，实在是太美好了，小巧的机身，极致极客的金属质感。起初我在这台完整的 openwrt 作为入网主路由，LAN 口后面带着 H3C 做 AP，但是这依旧没有解决魔法失效全家网络崩溃的问题。于是我找到了旁路由这个方案，随后由于魔法频繁失效、至最近半年无法订阅等各种问题出现，一直没有解决，所以我的 R2S 已经荒废已久。在今晚，他迎来了重生！！！
> 

## 环境情况

至今，我家里的网络拓扑如下
![2d6eb5680b619bd928496d3bc2bb990d.png|300](https://imgbed.anluoying.com/2026/03/b386f2852d32c31b10d7e89dcb1fa409.png)
这里直接用 iStoreOS 的图表示了

其中 WIFI-路由器是我的主路由，入网用以及担任 zerotier 组网 还有无线 AP
其中一条 LAN 口连接 R2S 的 LAN 口

H3C IP：`192.168.6.1`
R2S IP：`192.168.6.80`

以往使用时，我会将需要魔法的设备网关指定 R2S 来使用，而如果我修改了这个配置、他是对我的网络适配器做修改，也就是说当我换一个环境和网络，他连上不同的网络还用这个固定配置，就会失效（这里我没仔细研究，只是觉得不方便）这是我的第一个需求，要能自动从路由器发 IP 的时候就自动分开，但是老版本的 immortalwrt 或者 R2S 的完整 openwrt，DHCP 的 GUI 界面里面都暂时没有这种功能。分配静态地址时只能指定 IP 给指定 MAC

所以也一直搁置着，昨晚我购买了一份更昂贵的套餐后，选择复活 R2S

## 升级固件

刚开始来到 passwall2的页面，再次尝试订阅和手动导入，都没有成功。于是我推测是 Xray 那些固件太老了。于是我尝试通过页面手动更新，结果直接失败。

那我就想找到新的 passwall2 来手动更新整个服务
[Releases · Openwrt-Passwall/openwrt-passwall2](https://github.com/Openwrt-Passwall/openwrt-passwall2/releases)

![80415191ba2da0709fa33a9786f0d28d.jpg|300](https://imgbed.anluoying.com/2026/03/69742b8c62ed6755e9ebf0cb375ecd15.jpg)

结果是完全不行，okpg 似乎非常落后，到处都不兼容，所以没研究太多。我就决定直接升级整个 wrt

按照 G 老师的推荐，我找到了[iStoreOS download \| SourceForge.net](https://sourceforge.net/projects/istoreos/) ，不得不说（AI 万岁）
配合[balenaEtcher - Flash OS images to SD cards & USB drives](https://etcher.balena.io/#download-etcher)进行刷机，断电拔掉内存卡

此处欠了几张图

刷完之后插上内存卡，等待灯闪烁平稳后，访问 `192.168.100.1` 默认密码 password
进入页面后一看服务啥都木有，先装个 passwall2，我在市场里没找到，所以就用.run 自己安装
[Are-u-ok/apps/all/PassWall2\_26.2.14\_aarch64\_a53\_all\_sdk\_22.03.7.run at main · AUK9527/Are-u-ok · GitHub](https://github.com/AUK9527/Are-u-ok/blob/main/apps/all/PassWall2_26.2.14_aarch64_a53_all_sdk_22.03.7.run)
安装 .run
![Screenshot 2026-03-25 at 22.53.25.png|361](https://imgbed.anluoying.com/2026/03/cc22ff204115812860c2606a9f1b7e6a.png)

安装完成后看日志有几个包没成功
几个老的 shadowsocksr-libev-ssr-xxx 包（SSR 协议的旧实现），因为它们依赖 libopenssl1.1，而 iStoreOS 24.10 系列已经切换到 OpenSSL 3.x，不再提供 libopenssl1.1。

刷新后 发现系统已经自动重启，随后左侧菜单服务里面能看到 passwall2，导入订阅，一波通！！！！ 畅快！

随后做了 AI 的相关分流规则，其余的暂时都还先不做了，先解决我上面的问题

## 配置旁路由 IP

R2S 此时连接我的 macbook，给他的 LAN 口接口进行配置
IP 地址还是设置成 `192.168.6.80`，网关指向主路由：`192.168.6.1`
然后断开网线，连上主路由，等待片刻后即可通过主路由的网访问到 R2S

## DHCP 指哪打哪

最开始我回主路由又找了一圈，还是一样的结果，没有找到相关指定IP还能指定网关的设置

这个功能需要 dnsmasq 的 tag 功能，显然我的阉割 wrt 没有，我也懒得刷主路由（稳定点算了）

### 把 DHCP 服务交给旁路由 B

#### 1. 在主路由 A（ImmortalWrt）上**关闭 DHCP**

- 登录主路由后台（192.168.6.1）
- 进入 **网络 → 接口 → LAN → 编辑**
- 在 **DHCP 服务器** 标签页，把 **忽略此接口** 勾上（或直接禁用 DHCP 服务）
- 保存并应用

这样主路由就不再发放 IP 了，所有设备都会向旁路由请求 IP。
![9092901c54bb8190d9df44b89b4e862f.png|300](https://imgbed.anluoying.com/2026/03/14febcb8c59a6ebe9040a458ec69afd2.png)

#### 2. 在旁路由 B（iStoreOS）上配置 DHCP（关键部分）

- 登录 R2S 后台（192.168.6.80）
- 进入 **网络 → 接口 → LAN → 编辑**

**基本设置**（保持不变）：

- 协议：静态地址
- IPv4 地址：192.168.6.80
- 子网掩码：255.255.255.0
- IPv4 网关：**192.168.6.1**（指向主路由 A，让所有流量先经过主路由拨号）
![67eeb25eada532c0a831851fac61d3ef.png|300](https://imgbed.anluoying.com/2026/03/76a78bd2ccab6d0a00ba310e955803de.png)

DHCP 设置唯一授权
![911a5bf1762183b330a4313ac5065b47.png|300|300](https://imgbed.anluoying.com/2026/03/04affdee4e0c22c7e33534e2c638da04.png)
**DHCP 服务器 → 高级设置**（给普通设备用）： 在 **DHCP 选项** 中添加两行：

- 3,192.168.6.1 （网关指向主路由）
- 6,192.168.6.1 （DNS 也指向主路由）
![9205e12e83a284a3e7c9f54aeb56c93a.png|300](https://imgbed.anluoying.com/2026/03/2ed58f786c0126491751826ab0d314b5.png)

> [!tip] 
> 注意是两行，我刚开始写在同一行也不报错，苦恼了很久
> 

**创建标签（给需要翻墙的设备用）**：

- 进入 **网络 → DHCP/DNS → 标签**
- 添加一个新标签，名称填：proxy（或 t_proxy）
- 在这个标签的 **DHCP 选项** 中添加两行：
    - 3,192.168.6.80
    - 6,192.168.6.80 （网关和 DNS 都指向自己）

![7fde1f5ab79e1e0a349741432ad35b2a.png|300](https://imgbed.anluoying.com/2026/03/7454e1ec8d34c1f4d5fdf2c358772278.png)


**静态地址分配（绑定 MAC）**：

- 进入 **网络 → DHCP/DNS → 静态地址分配**
- 添加一条：
    - 主机名称：随便填（比如 my-pc）
    - MAC 地址：填你那台电脑的 MAC
    - IPv4 地址：可以留空（自动分配），或填一个固定 IP（如 192.168.6.100）
    - **标签**：选择刚才的 proxy
- 保存并应用

![22928a5b1cc6d43a92ac1fe33668c94e.png|300](https://imgbed.anluoying.com/2026/03/ee2c1a07d14eaa90b7da90e5292b51f1.png)
这里我的 macbook 有 保护 MAC 地址的功能。所以我把真假两个都填上去了。

- 在需要翻墙的电脑上：断开网络 → 重新连接（或 ipconfig /release + /renew）
- 用 ipconfig（Windows）检查：
    - 默认网关应该是 **192.168.6.80**
    - DNS 也是 **192.168.6.80**


> [!hint] 
> 然后现在遇到了个倒霉的事情，在外面跑的时候，发现 Todesk 回不了家，他说我家里电脑是海外用户。回头还要配置一下 