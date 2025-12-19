---
title: lambda 引发的编程语言陈年知识回顾
description: "这篇文章回顾了“lambda”相关的编程语言基础知识，主要包括以下几个方面：1. **什么是 Lambda**     - Lambda（希腊字母 λ）源自 Alonzo Church 在1936年发明的 lambda 演算，所有函数都是匿名的。     - 匿名函数（lambda 函数）概念由此而来，许多编程语言都支持用关键字 `lambda` 定义匿名函数。     - 以 Python 为例，`lambda 参数: 表达式` 是定义匿名函数的语法。2. **什么是 Lisp**     - Lisp 是1958年诞生的老牌函数式编程语言，是匿名函数和闭包等概念的重要发源地。     - 函数式编程强调不可变性、纯函数和函数作为“一等公民”，与命令式编程有本质区别。     - 文中给出了 Lisp 的阶乘代码示例，并指出其代码风格不易阅读，但其思想影响深远。3. **一等公民和闭包**     - 一等公民：指函数可以像数据一样被传递、返回和赋值。     - 闭包：是一个函数及其“出生时环境”的组合，即内部函数携带外部变量，即使外部函数执行完毕变量也不会消失。     - 通过 Python 示例详细解释闭包如何工作。4. **Python 的 map 函数简介**     - 简单介绍了 Python 内置的 `map()` 函数，用于对序列中的元素进行映射转换。5. **AWS Lambda 简介**     - AWS Lambda 是亚马逊云服务提供的无服务器计算平台，其命名灵感来自 lambda 演算中的匿名函数，但本质是事件驱动的小型计算单元，不同于传统意义上的 lambda 函数。总结来说，这篇文章通过回顾 lambda 的历史起源、相关概念及实际代码示例，加深了对 lambda 及其衍生概念（如闭包、一等公民）的理解，同时简要介绍了 AWS Lambda 与传统 lambda 概念的联系与区别。"
date: 2025-12-05T17:14:17+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
tags:
  - programming-language
categories:
  - 杂技浅尝
lastmod: 2025-12-10T00:26:16+08:00
---
> 偷听会议室老板拷打同事知道什么是 lambda 吗？同时我正在看一篇关于使用aws mqtt的文章，里面提到了aws lambda。我一想，lambda 不就是匿名函数吗，然后呢，似乎我并不了解他，就好像我看到一只鸟，我知道他叫布谷鸟，也许我知道他还叫大杜鹃（实际不知道，我刚刚搜的），英文名叫Cuculus canorus，但是我依旧不了解他（ `费曼父亲的教导`），那么我深深反思，我不知道什么是 lambda，我现在需要知道一下。
> 
>所以在这过程里，我问了一些问题，什么是 lambda、什么是 Lisp、什么是一等公民、什么是闭包、python 的 map 是啥

## 什么是Lambda

> 我有一种中国学生的特性，写东西模糊有一种框架 1. 定义 2. 内容 3. 意义 4. 展望。
> 感觉这很蠢，但我暂时没有更棒的方式，当然这种文章不会有展望

这个就读 Lambda `λ` ，希腊字母表第 11 个字母
[Lambda - Wikipedia](https://en.wikipedia.org/wiki/Lambda)

为什么匿名函数叫 Lambda
[Anonymous function - Wikipedia](https://en.wikipedia.org/wiki/Anonymous_function)

> Anonymous functions originate in the work of [Alonzo Church](https://en.wikipedia.org/wiki/Alonzo_Church "Alonzo Church") in his invention of the [lambda calculus](https://en.wikipedia.org/wiki/Lambda_calculus "Lambda calculus"), in which all functions are anonymous, in 1936, before electronic computers.[[2]](https://en.wikipedia.org/wiki/Anonymous_function#cite_note-2) In several programming languages, anonymous functions are introduced using the keyword _lambda_, and anonymous functions are often referred to as **lambdas** or **lambda abstractions**. Anonymous functions have been a feature of [programming languages](https://en.wikipedia.org/wiki/Programming_language "Programming language") since [Lisp](https://en.wikipedia.org/wiki/Lisp_\(programming_language\) "Lisp (programming language)") in 1958, and a growing number of modern programming languages support anonymous functions.

36 年联合抗日呢，该死的小鬼子，Alonzo发明了 lambda 微积分，其中所有函数都是匿名的，当时还没有电子计算机，但是在之后就引用了这个名字，这里有个 Lisp，第一次听说这个语言是 李继刚老师写提示词给 claude 的时候用的，当时看了一眼，我滴天，这是啥？

以下用 python 做例子，我也只会 python 和 javascript

python 中的 lambda 函数就像这样

```python
# no lambda
def double(x):
    return x * 2

nums = [1, 2, 3]
result = map(double, nums)

# use lambda
nums = [1, 2, 3]
result = map(lambda x: x * 2, nums)
```

语法就像是
`lambda 参数: 表达式`
等价于
```
def 函数名(参数):
    return 表达式
```

## 什么是 Lisp

> 函数式编程 (Functional Programming, FP)
> (像 C, Java, Python 的基础写法）叫**命令式编程 (Imperative Programming)**

[Lisp - Wikipedia](https://en.wikipedia.org/wiki/Lisp)

gemini3 解释

函数式编程 (FP) 的思维方式完全不同：
- 函数式： 像是在设计流水线（数学公式）。
它不关心“怎么一步步做”，它只关心“数据怎么转换”。
核心思想：
- 不可变 (Immutability)： 数据一旦创建就不能改。你想把 x 变成 x+1？不行，你必须创建一个新的 y 等于 x+1。
- 纯函数 (Pure Function)： 函数不能有副作用（比如修改全局变量、打印东西）。给它同样的输入，它永远吐出同样的输出。
- 函数是“一等公民”： 函数可以像数字、字符串一样，被传参数、被返回、被赋值给变量。

例子：

```Lisp
(defun factorial (n)
  (if (<= n 1)
      1
      (* n (factorial (- n 1)))))
```

1. (defun factorial (n) ...)：定义函数 factorial，参数是 n。
2. (if (<= n 1) ...)：如果 n 小于等于 1。
3. (* n (factorial (- n 1)))：计算 n 乘以 (n-1) 的阶乘。

这不是很好读的样子，至少作为代码来说，我不喜欢，数括号很花时间
这是老祖宗级别的语言，虽然现在使用率应该非常低，但是他有很多灵魂都活到了现在
（Lambda,  闭包, 动态类型）

有意思的是，python 的 lambda 是社区贡献者引入的，这个特性 python 作者并不喜欢（我也不喜欢≈我和 python 作者差不多）
[The fate of reduce() in Python 3000](https://www.artima.com/weblogs/viewpost.jsp?thread=98196)

在这里我再次触发了初学 javascript 的疑问。一等公民和闭包

## 什么是一等公民和闭包

### 一等公民（First-class citizen）
[頭等物件 - 维基百科，自由的百科全书](https://zh.wikipedia.org/wiki/%E9%A0%AD%E7%AD%89%E7%89%A9%E4%BB%B6)

有一等就有二等，下面是 gemini 给的解释
![image.png](https://imgbed.anluoying.com/2025/12/c8a5fd68ad849f69fc9770b505e2efd9.png)

### 闭包（Closure）

[闭包 (计算机科学) - 维基百科，自由的百科全书](https://zh.wikipedia.org/zh-hans/%E9%97%AD%E5%8C%85_(%E8%AE%A1%E7%AE%97%E6%9C%BA%E7%A7%91%E5%AD%A6))

闭包的概念是在1960年代为采用[lambda演算](https://zh.wikipedia.org/wiki/Lambda%E6%BC%94%E7%AE%97 "Lambda演算")的表达式的机器求值而开发的，它首次在1970年于[PAL](https://zh.wikipedia.org/wiki/PAL_\(%E7%BC%96%E7%A8%8B%E8%AF%AD%E8%A8%80\) "PAL (编程语言)")编程语言中完全实现，用来支持词法作用域的[头等函数](https://zh.wikipedia.org/wiki/%E5%A4%B4%E7%AD%89%E5%87%BD%E6%95%B0 "头等函数")。

哈基米装萌给我一个他认为很通俗的解释

**闭包 = 函数 + 它“出生”时的环境（随身携带的数据）。**

通常情况下，一个函数跑完，它里面的变量就会被**销毁**（像是一个临时的酒店房间，你退房了，清洁工就把东西清空了）。

但是，如果这个函数在内部定义了一个**小函数**，并且把这个小函数送（return）了出来：  
这个小函数会**背着一个背包**，背包里装了它在“老家”用到的变量。即使“老家”已经被销毁了，这个小函数依然能从背包里拿出那些变量来用。

**这个“背着背包的小函数”，就叫闭包。**

---
来个例子
```python
def make_multiplier(n):
    # --- 这是一个外部函数（老家） ---
    # n 是这里的局部变量
    
    def multiplier(x):
        # --- 这是一个内部函数（孩子） ---
        # 注意：这里用到了外部的 n
        return x * n 
    
    return multiplier  # 把内部函数送出去
    #“一等公民”权利：**函数可以作为返回值**
    
# 1. 创建一个“乘以 3”的函数
times3 = make_multiplier(3) 

# times3 就是闭包，他不仅带着 x*n 还带着 n=3
# 此时，make_multiplier(3) 已经运行结束了！
# 按理说，变量 n=3 应该消失了。

# 2. 但是，当我们调用 times3 时...
print(times3(10))  # 输出 30
```

闭包在实现上是一个结构体，它存储了一个函数（通常是其入口地址）和一个关联的环境（相当于一个符号查找表）。
具体的 wiki 里面写的很详细，可以细细看一遍

## python的map是啥

这个 map 混淆到我了。[Python map() 函数 \| 菜鸟教程](https://www.runoob.com/python/python-func-map.html)
确实没怎么用过

## AWS Lambda

AWS Lambda 是亚马逊云服务中的无服务器计算平台，它命名灵感来自 lambda 演算中的匿名函数，但本质是事件驱动的小型计算单元，不同于编程语言里的 lambda 函数实现。不过它们都体现了“小而灵活”的思想。

## 最后

我就来记下了这些内容，感谢 AI，（希望科技继续发展。早日实现赛博飞升。）开始说梦话
