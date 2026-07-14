---
title: 什么是 CUDA：用 Java 世界的类比看懂 Driver / Toolkit / PyTorch / Conda
description: Driver、CUDA Toolkit、PyTorch、Conda 这几个概念很容易混在一起，本文用 Java 开发者熟悉的 JVM / JDK / Spring Boot 做类比，把它们的关系理清楚。
date: 2026-07-14T22:17:51+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-07-15T00:23:44+08:00
showLastMod: true
tags:
  - AI
  - NVIDIA
  - environment
categories:
  - 什么是什么
---
>AI 开发配置 conda / cuda / pytorch / nvidia-driver 很容易混淆，让人头疼，实际上踩过几次坑就能摸清它们的概念和关系了。本文尝试用 Java 开发者熟悉的语言，对照解释几个常见概念。

![Java 与 CUDA 的概念类比|300](https://imgbed.anluoying.com/2026/07/68c98b6b0033f7ed63acd08f6c7df787.png)

|**GPU 世界**|**Java 世界**|**作用**|
|---|---|---|
|GPU 硬件|CPU|真正执行计算|
|NVIDIA Driver|JVM（HotSpot）|控制硬件、执行程序|
|CUDA Toolkit|JDK|给开发者写程序用|
|nvcc|javac|编译器|
|libcudart.so|Java Runtime Library|运行时库|
|cuBLAS/cuDNN|Netty、Apache Commons 等第三方库|提供高性能计算能力|
|PyTorch|Spring Boot|应用框架|
|conda|SDKMAN / Maven + 环境管理|管理版本|

下面一点一点讲。

---

## **第一层：GPU Driver（最重要）**

先理解一件事：GPU 本身不会执行 CUDA C++。

GPU 最终执行的是一种叫做 **SASS** 的机器码。

整个过程实际上是：


![CUDA C++ 到 GPU 执行的编译与驱动链路|300](https://imgbed.anluoying.com/2026/07/41ea81f45f6f8d56080bcce7ad3ee351.png)

这里 Driver 做了很多工作：

- 管理 GPU
- 分配显存
- 调度 Kernel
- 把 PTX 编译成当前 GPU 的机器码

所以 Driver 是 GPU 的运行时，可以理解成：

```
Java                CUDA

.class              .ptx
   │                   │
   ▼                   ▼
  JVM               Driver
   │                   │
   ▼                   ▼
  CPU                 GPU
```

![Java 运行时与 CUDA Driver 的角色对照|300](https://imgbed.anluoying.com/2026/07/fa66ce6f9468428a5a55bfa40293b230.png)

**没有 Driver，GPU 什么都跑不了。**

---

## **第二层：CUDA Toolkit**

很多人以为 CUDA 就是 Driver，其实不是。CUDA Toolkit 是开发工具，里面包括：

```
CUDA Toolkit

├── nvcc
├── libcudart.so
├── cuda runtime
├── headers
├── examples
├── cuBLAS
├── cuFFT
├── cuRAND
├── nvprof
├── nsight
└── ...
```

可以理解成：

```
JDK

├── javac
├── java
├── javadoc
├── jar
├── rt.jar
└── ...
```

![CUDA Toolkit 与 JDK 的工具箱类比|300](https://imgbed.anluoying.com/2026/07/9df76639ff109ef35ef5f1b8482344e1.png)

CUDA Toolkit 是给开发者的，Driver 是给运行程序的。

---

## **第三层：为什么 Driver 和 Toolkit 可以分开**

这是 CUDA 最容易搞混的地方。例如下面这几种组合都完全没问题：

```
Driver 550  +  Toolkit 11.8
Driver 580  +  Toolkit 12.8
Driver 580  +  Toolkit 11.3
```

原因就是：Driver 会向下兼容。例如：

```
Driver 580

支持：

CUDA 12.8
CUDA 12.7
CUDA 12.6
CUDA 12.5
...
CUDA 11.x
```

所以新的 Driver 可以运行老程序，就像：

```
Java 21 JVM

可以运行

Java 8  的 class
Java 11 的 class
Java 17 的 class
```

![新版本 NVIDIA Driver 向下兼容旧 CUDA Runtime|300](https://imgbed.anluoying.com/2026/07/49ebd079c7b6cf972be5245783f56c5d.png)

需要注意的是，Driver 只能向下兼容，反过来不行：太老的 Driver 撑不起太新的 Toolkit（或 PyTorch 打包的 Runtime），这个坑在第七层会具体讲。

---

## **第四层：Toolkit 是什么时候需要安装？**

如果要自己开发 CUDA，就需要 CUDA Toolkit，因为要用到编译器 `nvcc`：

```
nvcc hello.cu
```

但如果只是跑 PyTorch，很多时候**根本不用安装 Toolkit**。因为 PyTorch 已经把需要的 Runtime 打包好了：

```
site-packages

torch

├── libcudart.so
├── libcublas.so
├── libcudnn.so
└── ...
```

![PyTorch 自带 CUDA Runtime 依赖|300](https://imgbed.anluoying.com/2026/07/9d6c4443d1db01720f16c4acb1358821.png)

PyTorch 自己带 Runtime，只要求系统 Driver 足够新。

---

## **第五层：PyTorch 到底是什么？**

很多人以为 PyTorch 就等于 CUDA，完全不是。PyTorch 是一个框架，就像 Java 世界里的 Spring Boot，内部会调用 CUDA：

```
Python
   ↓
PyTorch
   ↓
CUDA Runtime
   ↓
Driver
   ↓
GPU
```

所以 PyTorch 不负责驱动 GPU，它只是调用 CUDA API。

---

## **第六层：为什么 PyTorch 有这么多版本？**

例如 `torch==2.7` 会有 `cu118`、`cu121`、`cu126` 好几个版本，很多新人看不懂。其实意思就是：这个 PyTorch 是拿哪个 Toolkit 编出来的。

例如 `torch 2.7 + cu118` 意味着编译时用的是 CUDA 11.8，里面带的是：

```
libcudart 11.8
cublas    11.8
cudnn     9.x
```

而 `torch 2.7 + cu126` 里面打包的就是 CUDA 12.6 Runtime。

![PyTorch 不同 CUDA Runtime 版本的安装包|300](https://imgbed.anluoying.com/2026/07/ad3130c3738231eff72ac140eaff9542.png)

注意，这里不是要求你系统安装 CUDA 12.6，只是 PyTorch 自己带了 CUDA 12.6 Runtime。

---

## **第七层：Driver 为什么要求最低版本？**

例如官网写：

```
PyTorch cu126
Need Driver >= 560.xx
```

原因是 Runtime 要调用 Driver：

```
PyTorch
   ↓
CUDA Runtime 12.6
   ↓
Driver
```

如果 Driver 太老，比如只支持到 CUDA 11，就会直接报错：

```
CUDA driver version is insufficient.
```

![旧 Driver 无法承载新 CUDA Runtime|300](https://imgbed.anluoying.com/2026/07/468ce9ba6aa16962ef01e1c383a381b7.png)


所以 Driver 必须足够新。

---

## **第八层：Conda 到底管理什么？**

很多人觉得 Conda 管 CUDA，其实它管理的是整个运行环境：

```
conda create
   ↓
Python 3.12 + numpy + torch + transformers + opencv + ...
```

甚至连 PyTorch 自带的 CUDA Runtime，也会一起装进去：

```
conda env

├── python
├── numpy
├── torch
├── cudnn
├── libcudart
└── ...
```


![Conda 隔离不同 PyTorch CUDA 环境|300](https://imgbed.anluoying.com/2026/07/0c893de1fa7c42f385cd6b7959da45e4.png)

所以不同环境，比如 `env1` 装 `torch cu118`、`env2` 装 `torch cu126`，完全可以共存，互不影响。

---

## **第九层：真正安装顺序**

假设一台新的 Ubuntu，实际安装顺序是这样的。

第一步，安装 Driver：

```
GPU
   ↓
Driver
```

装好之后跑一下 `nvidia-smi`，能看到 `Driver Version` 和 `CUDA Version`。这里的 **CUDA Version** 指的是**Driver 能支持的最高 CUDA API 版本**，不是系统安装了对应版本的 Toolkit。

如图所示，这个命令还能看到红框中的显存使用 / 显存大小，右侧则是 GPU 使用率。

![nvidia-smi 输出中的显存与 GPU 使用率|300](https://imgbed.anluoying.com/2026/07/1f3be418a026404a04bedc43d57f97df.png)

![nvidia-smi 中 CUDA Version 表示 Driver 最高支持版本|300](https://imgbed.anluoying.com/2026/07/397e2ce09f33144e38ab883383465557.png)


第二步，安装 Conda（Miniconda 即可）。

第三步，创建环境：

```bash
conda create -n ai python=3.12
```

第四步，安装 PyTorch，例如：

```bash
conda install pytorch torchvision pytorch-cuda=12.6 -c pytorch -c nvidia
```

或者：

```bash
pip install torch --index-url https://download.pytorch.org/whl/cu126
```

整个过程中，**完全不用安装 CUDA Toolkit**。

---

## **第十层：什么时候才需要 Toolkit？**

只有以下这些情况才需要 CUDA Toolkit：

```
✓ 写 CUDA C++
✓ 自己编译 .cu
✓ 编译 FlashAttention
✓ 编译 xformers
✓ 编译 TensorRT Plugin
✓ 开发 CUDA Kernel
```

否则，无论是 AI 推理、AI 训练，还是用 PyTorch、TensorFlow、JAX，一般都不用单独安装 Toolkit。

![需要 CUDA Toolkit 的两条使用路径|300](https://imgbed.anluoying.com/2026/07/0692c91b5176df6506bea25044ce72b9.png)

---

最后，用一张完整的关系图总结：

```text
                  你的 Python 代码
                         │
                         ▼
                   PyTorch / TensorFlow
                         │
        （自带 CUDA Runtime、cuBLAS、cuDNN 等）
                         │
                         ▼
                 NVIDIA Driver（系统安装）
                         │
            管理 GPU、加载 Kernel、调度执行
                         │
                         ▼
                      GPU 硬件
```

而 **CUDA Toolkit** 更像一个独立的开发工具包：

```text
CUDA Toolkit
├── nvcc（CUDA 编译器）
├── 头文件（cuda.h 等）
├── CUDA Runtime 开发库
├── cuBLAS / cuFFT / cuRAND 等开发库
├── 调试与性能分析工具（Nsight 等）
└── 示例代码
```

日常做 AI 开发时，最常见的模式就是：

- 系统安装一个较新的 **NVIDIA Driver**。
- 用 **Conda** 为每个项目创建独立环境。
- 在环境中安装对应 CUDA 版本的 **PyTorch**（它会带上所需的 CUDA Runtime）。
- 除非需要编译 CUDA 代码或 C++ 扩展，否则通常不安装 **CUDA Toolkit**。这样既省事，也避免了多个 Toolkit 版本之间的管理问题。

![CUDA、Driver、PyTorch、Toolkit 的完整关系|300](https://imgbed.anluoying.com/2026/07/b3983132c8317e8413300a1708385238.png)
