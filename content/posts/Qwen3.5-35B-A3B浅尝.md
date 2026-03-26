---
title: Qwen3.5-35B-A3B浅尝
description: Qwen3.5-35B-A3B !info Qwen3.5 系列终于发布了小杯模型，对应的在阿里云提供 API，Qwen3.5-Plus 即 Qwen3.5-397B-A17B，Qwen3.5-Flash 即 Qwen3.5-3
date: 2026-02-25T16:06:16+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-02-25T17:20:24+08:00
showLastMod: true
tags:
  - llm
  - vLLM
categories:
  - 杂技浅尝
---
## Qwen3.5-35B-A3B

> [!info] 
>  
>Qwen3.5 系列终于发布了小杯模型，对应的在阿里云提供 API，Qwen3.5-Plus 即 Qwen3.5-397B-A17B，Qwen3.5-Flash 即 Qwen3.5-35B-A3B。
>
>前面几天对于 Qwen3.5-Plus 的表现，网友评论都是不错、那么这个小杯表现如何是我们比较关注的，毕竟一点资源就能跑起来了。

[Qwen3.5 Usage Guide - vLLM Recipes](https://docs.vllm.ai/projects/recipes/en/latest/Qwen/Qwen3.5.html)
[Qwen/Qwen3.5-35B-A3B · Hugging Face](https://huggingface.co/Qwen/Qwen3.5-35B-A3B)

服务器信息：

```
【CPU 信息】
CPU 型号: Intel(R) Xeon(R) CPU E5-2680 v4 @ 2.40GHz
CPU 核心数: 32

【系统版本】
操作系统: Ubuntu
版本: 22.04.5 LTS (Jammy Jellyfish)
内核版本: 5.15.0-168-generic

【GPU 信息】
NVIDIA GPU 检测到:
  GPU 0:  NVIDIA GeForce RTX 3090
    显存:  24576 MiB
    驱动版本:  580.126.09
  GPU 1:  NVIDIA GeForce RTX 3090
    显存:  24576 MiB
    驱动版本:  580.126.09
  GPU 2:  NVIDIA GeForce RTX 3090
    显存:  24576 MiB
    驱动版本:  580.126.09
  GPU 3:  NVIDIA GeForce RTX 3090
    显存:  24576 MiB
    驱动版本:  580.126.09
  GPU 4:  NVIDIA GeForce RTX 3090
    显存:  24576 MiB
    驱动版本:  580.126.09

CUDA 版本:
  13.0
```

## 部署

按照官方文档 安装最新的 vLLM，使用 vLLM 部署qwen3.5-35b-a3b，（我习惯使用 vLLM，好用、性能也很好）

根据我的显卡资源情况，保守估计，调整 tp size 并行跑在 4 张卡上、max-model-len 设置为 128k，也是官方表示的最低限制。并发最高 32

``` bash
vllm serve /data/huggingface_model/Qwen/Qwen3.5-35B-A3B --served-model-name qwen3.5-35b-a3b --port 13538 --tensor-parallel-size 4 --max-model-len 128000 --reasoning-parser qwen3 --enable-auto-tool-choice --tool-call-parser qwen3_coder --gpu-memory-utilization 0.85 --max_num_seqs 32
```

单请求输出速度 200+Tokens/S ，且原生支持多模态

![|500](https://imgbed.anluoying.com/2026/02/cd3241e5e91f465785f96683b1444266.png)

之前写的小脚本测一下32个并发下简单问题输出情况

![|300](https://imgbed.anluoying.com/2026/02/37981da04956014be7c36c00baed3856.png)

![image.png|300](https://imgbed.anluoying.com/2026/02/77a9d9a6b1b18e72ce70fadfe5d6f90b.png)

符合预期，MOE 模型的吞吐还是很满意的，但是这个思考不知道是否可开关，以及还有一个 27B 的 Dense 模型理论上应该更聪明。打算后续接入 openClaw 测试一下效果。