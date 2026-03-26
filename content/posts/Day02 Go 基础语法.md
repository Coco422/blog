---
title: Day02 Go 基础语法
description: "!summary 惭愧，举例 Day1 已经过去 83 天了。今天才开始继续学习 翻出 A Tour of Go，继续上次的篇章往下走一走 For Go 只有一种循环结构，即 for 循环。 最基本的 for 循环由三个部分组成"
date: 2025-12-21T23:43:29+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: true
lastmod: 2026-03-13T18:31:36+08:00
showLastMod: true
tags:
  - go
categories:
  - go-learn
---
> [!summary] 
>  惭愧，举例 Day1 已经过去 83 天了。今天才开始继续学习
>  翻出 A Tour of Go，继续上次的篇章往下走一走

## For

Go 只有一种循环结构，即 **for 循环**。

最基本的 for 循环由三个部分组成，这三个部分之间使用分号分隔：

初始化语句（init statement）：在第一次循环迭代之前执行。
条件表达式（condition expression）：在每次循环迭代开始前进行判断。
后置语句（post statement）：在每次循环迭代结束时执行。

初始化语句通常是一个简短的变量声明，在这里声明的变量只在该 for 语句的作用域内可见。

当布尔条件表达式的结果为 false 时，循环将停止执行。
注意：与 C、Java 或 JavaScript 等语言不同，Go 的 for 语句三个组成部分外部没有括号，同时代码块的大括号 { } 是必须存在的。