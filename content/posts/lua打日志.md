---
title: lua打日志
description: "从 FreeSWITCH 日志示例出发，解释 Lua 的冒号调用、字符串拼接、string.rep 与 consoleLog 用法，帮助快速读懂基础日志代码。"
date: 2025-09-25T15:44:17+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
tags:
  - Lua
  - freeswitch
categories:
  - 杂技浅尝
lastmod: 2025-12-10T00:26:21+08:00
showLastMod: true
---
>[!NOTE]
>lua 有很多有趣的语法和平时的不一样，比如这个打印字符串


```lua
local banner = string.rep("★", 12) .. " ORDER_NO: " .. orderNo .. " " .. string.rep("★", 12)

session:consoleLog("ALERT", banner .. "\n")

session:consoleLog("ALERT", string.rep("=", #banner) .. "\n")
```

这里的写法有几个点

`session:consoleLog`中 `:` 有点像 `.` 就像是 `session.consoleLog`一样，他第一个默认参数就是 self，ALERT就是红色的 ERROR 那种样子的样式

随后 `..` 是 lua 的字符串连接符号

string.rep(A,B)函数的用处就是返回 A 字符串重复 B 次
这里就是用 `#banner` 获取banner的长度。然后重复
