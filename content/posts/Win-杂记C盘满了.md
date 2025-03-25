---
title: "Win 杂记C盘满了"
description: 
date: 2025-03-22T19:15:00+08:00
tags: ["windows","环境"]
categories: ["杂技浅尝"]
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
---

>去年装的新电脑，刚开始只买了一块2T的SSD。自作聪明给C盘分了100G觉得足矣。结果随后不到两个月就是无尽的红色警告

直到今天终于忍不了了。
之前因为存储焦虑（因为大学配的ITX只买了一块西数500G的，那真的是捉襟见肘的存储。游戏随玩随删）
这次配电脑没多久还买了一块二手16T希捷企业机械盘。买之前担惊受怕 买之后只能说（真香）
这里必须提醒。二手盘有风险，数据无价。我有多次备份的习惯，所以大胆入了，除了炒豆子有点吵，用着感觉还行。

## 解决方案

bb太多有点偏题，解决方案很简单。

- **右键我的电脑。有一个计算机管理（Manage）**

![image.png](https://raypicbed.oss-cn-shenzhen.aliyuncs.com/images/20250320233439439.png)

- **打开存储->磁盘管理**

![image.png](https://raypicbed.oss-cn-shenzhen.aliyuncs.com/images/20250320233526034.png)

可以看到下面是我的SSD 此时C盘右侧邻近的是我的D盘.F盘是从D盘压缩出来的

- **右键D盘**

![image.png](https://raypicbed.oss-cn-shenzhen.aliyuncs.com/images/20250320233614990.png)

- **点击压缩卷(Shrink Volume).**

不知道为什么我这里最多只能压缩出来640G 但是D盘我本身还有很多,这里一路Next.随后压缩出来的卷会显示未分配.我这里因为已经新建了F盘了 就不截图了,右键未分配进行新建卷即可

然后备份D盘的内容到F盘.
> [!TIP]
> 如果D盘大于F盘怎么办呢(哥们我全给删了.反正都是游戏)
> 哈哈备份走就好了

文件清空后对D盘 Delete Volume/ 删除卷

*长达两个小时的安静*

## 沃日

太麻烦了
一怒之下直接全部清空。重装。现在一块2T C盘 一块 16T E盘。舒服！！！！