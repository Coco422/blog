---
title: 25GB 内存就能跑 GLM-5.2？我在 RTX 3060 上实测了 744B MoE
description: colibri 宣称消费级机器也能运行 GLM-5.2 744B。我在一台 RTX 3060、40GB 内存的内网虚拟机上完成部署，并测试了磁盘流式专家、VRAM/RAM 分层、O_DIRECT、MTP 与实际生成速度。
date: 2026-07-17T19:07:57+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-07-18T13:47:47+08:00
showLastMod: true
tags:
  - AI
  - colibri
  - MoE
  - CUDA
categories:
  - 杂技浅尝
---

> [!info]
> 先说结论：**能跑，是真的；能不能用，是另外一回事。**
>
> 在我的 RTX 3060 开发机上，GLM-5.2 744B 最终跑到了约 **0.44 tok/s**。这是一项很有意思的工程实验，但距离正常聊天还有很远。

最近看到一个很吸引眼球的项目：[JustVugg/colibri](https://github.com/JustVugg/colibri)。

这个词是蜂鸟的意思，借自法语 _colibri_，源自一加勒比语言

它的介绍很直接：

> Run GLM-5.2 (744B MoE) on a 25GB-RAM consumer machine.

744B 参数、25GB 内存、纯 C、零依赖，剩下的专家权重直接从磁盘读取。

刷到这个项目就觉得有意思，因为我本地的开发机也能跑（之前 KTransformer 也想跑，无奈服务器跑着一些业务一直腾不出来），要是这个项目能跑出个位数的 decode 速度就发了哈哈哈。但是 README 看了一圈就明白我的美梦破碎了，话不多说，先看我的折腾记录。

我有一台常用的开发机，已经被我虚拟化，把一台已经跑 MC 的虚拟机清掉，把 CPU、内存和磁盘资源合并到主力虚拟机上，下载了接近 400GB 的模型，真的把它跑了起来。

模型能正常对话，也有 OpenAI 兼容 API，仓库自带的 Brain Dashboard 还能看到 19,456 个专家在推理时不断闪烁。

它解决的是**可达性**，不是**可用性**。文末有在我这个环境实测的 GIF 效果。

![image.png|300](https://imgbed.anluoying.com/2026/07/303b67bb9f9ce4fd70ed423660a60588.png)

---

## **我的测试环境**

这次测试跑在一台 PVE 里的 Ubuntu 虚拟机上：

|项目|配置|
|---|---|
|系统|Ubuntu 24.04，KVM/QEMU|
|CPU|20 vCPU，AVX2/FMA，无 AVX-512/VNNI|
|内存|Linux 可见约 39GiB，另有 8GiB Swap|
|GPU|RTX 3060 12GiB，PCIe Passthrough|
|模型盘|500GB QEMU SCSI 磁盘，ext4|
|模型|GLM-5.2-colibri-int4-with-int8-mtp|
|模型总大小|383.74GB，共 144 个分片|
|路由专家|19,456 个，共 372.85GB|

实际运行时，进程 RSS 大约在 **27GB** 左右。测试配置中的 8GB VRAM 和 7GB RAM，指的是固定给热门专家使用的缓存层，不是整个程序的总内存占用。

模型仅稠密部分就约有 10.88GB，再加上工作区、KV Cache、专家 LRU 和服务进程，整机真的只有 10GB RAM 基本无法稳定运行。

所以后文中的“8GB VRAM + 7GB RAM”，应该理解成：

```text
8GB VRAM 热门专家层
+ 7GB RAM 固定专家层
+ 其他运行内存、LRU、Page Cache
= 进程 RSS 约 27GB
```

---

## **它为什么能够启动一个 383GB 的模型**

GLM-5.2 是一个 MoE 模型。

MoE 可以简单理解为：模型里有非常多“专家”，但是每次处理一个 Token 时，并不会把全部专家都计算一遍，而是由 Router 选择其中少量专家参与计算。

colibri 利用了这个特点。

它没有尝试把 383GB 权重全部塞进显存或内存，而是把模型拆成了两个部分：

1. Attention、Embedding、Shared Expert、Norm、LM Head 等稠密部分常驻内存。
2. 体积最大的 Routed Experts 放在磁盘上，需要时再读取。

专家又被分成三层：

```text
VRAM：根据历史使用频率固定最热门的专家
RAM：固定专家 + 每层 LRU 缓存
Disk：其余绝大多数专家
```

每个稀疏层有 256 个专家，每个 Token 会路由到最多 8 个。主模型完成一次生成，大约会产生 600 次专家选择。

一个主模型专家约 18.92MB，因此在完全冷缓存的情况下：

```text
600 × 18.92MB ≈ 11.4GB
```

也就是说，一个冷 Token 在逻辑上可能需要访问约 11.4GB 专家权重。

这就是这个项目最核心的地方：模型可以不放进内存，但消失的内存容量最终会变成磁盘带宽和延迟。

![image.png|300](https://imgbed.anluoying.com/2026/07/88786b1f8d02295914fae128e3fefd44.png)

---

## **19,456 个专家全部加载怎么做**

仓库截图里的 Brain Dashboard 显示，整个模型被画成一个 76×256 的大脑，每一个小格就是一个专家：

- 颜色表示专家当前位于 VRAM、RAM 还是 Disk。
- 亮度表示历史使用热度。
- 当前请求路由到的专家会闪白。

![image.png|300](https://imgbed.anluoying.com/2026/07/2e13fd88348948a6d749077eac07aa7b.png)


这台机器有 6 张 GPU，聚合显存约 202GB，同时还有约 264GB 系统内存。全部专家是由 **VRAM + RAM 共同承载**，并不是仅靠显存装下。

我的机器启动时专家加载情况是：

![0286a7fbaac7b146f79a60239f455cf8.png|300](https://imgbed.anluoying.com/2026/07/c2deb78751363a8500c9d4ddec5a24cc.png)

```text
VRAM：422
RAM：371
Disk：18,663
```

跑完一次请求、LRU 被填充后：

```text
VRAM：422
RAM：896
Disk：18,138
```

也就是说，即使已经预热，仍然有约 **93.2%** 的专家留在磁盘上。

---

## **我是怎么测试的**

为了让不同配置尽量可比较，我固定了：

- 同一个中文提示词：简洁解释水循环。
- `TEMP=0`，使用 Greedy Decode。
- 主要比较固定 24 个输出 Token。
- 使用独立模型软链接目录，避免平时积累的 `.coli_usage` 污染路由画像。
- 同时记录磁盘服务时间、专家矩阵乘、Attention、命中率、RSS 和 Major Fault。

这台机器最终比较合适的配置是：

```bash
DIRECT=1
DRAFT=0
CUDA_EXPERT_GB=8
PIN_GB=15
PIPE=0

RAM_GB=34
CTX=512

COLI_OMP_TUNED=1
OMP_NUM_THREADS=20
OMP_PROC_BIND=spread
OMP_PLACES=cores
```

其中：

- `CUDA_EXPERT_GB=8`：给热门专家约 8GB 显存。
- `PIN_GB=15`：VRAM 与固定 RAM 专家合计约 15GB，因此 RAM 固定层约 7GB。
- `DIRECT=1`：使用 O_DIRECT，尽量绕过容易产生抖动的 Page Cache 路径。
- `DRAFT=0`：关闭 MTP 推测解码。
- `PIPE=0`：这台机器上开启加载流水线没有得到收益。

---

## **实际速度：最好约 0.44 tok/s**

主要结果如下：

|配置|Decode|说明|
|---|---:|---|
|CPU-only，O_DIRECT|0.35 tok/s|修复 OpenMP 亲和性后的 CPU 基线|
|8GB VRAM + 7GB RAM，普通缓存读取|0.29 tok/s|同画像配对测试|
|8GB VRAM + 7GB RAM，O_DIRECT|0.45 / 0.43 tok/s|中位数约 0.44 tok/s|
|相同配置，`TOPP=0.7`|0.63 tok/s|减少低权重专家，存在质量交换|

O_DIRECT 是这轮优化里效果最明显的一项。

同一组 24 Token 测试中：

```text
Buffered：0.29 tok/s
O_DIRECT：0.45 / 0.43 tok/s
```

中位速度提升约 52%，专家磁盘服务时间从 61.2 秒降到了 33.1～36.0 秒。

这也从侧面证明：当前机器的主要瓶颈不是 RTX 3060 算不动，而是大部分专家仍然需要从磁盘读取。

GPU 专家层把 CPU-only 的 0.35 tok/s 提高到了约 0.44 tok/s，提升约 26%。但是 GPU 利用率并不高，因为只有约 2% 的专家固定在 VRAM 中，路由经常落到 RAM 或磁盘。

`TOPP=0.7` 可以达到 0.63 tok/s，是因为它会丢弃一部分权重较低的专家选择，把每个输出 Token 的专家加载量从约 575 降到 326。

它确实更快，用模型路由质量交换速度。

---

## **一个反直觉结果：给 RAM 塞更多专家，反而慢了一倍**

最开始我的想法很简单：既然磁盘慢，那就尽量多把专家固定在 RAM 里。

结果完全相反：

|固定专家层|速度|命中率|Major Fault|
|---|---:|---:|---:|
|8GB VRAM，不额外固定 RAM|0.31 tok/s|56.4%|3|
|8GB VRAM + 7GB RAM|0.33 tok/s|59.2%|6|
|8GB VRAM + 18GB RAM|0.15 tok/s|63.3%|1,547,638|

最后一组的命中率明明更高，速度却从 0.33 掉到了 0.15 tok/s。

原因是 RAM 不只用于固定专家。

系统还需要：

- 稠密权重。
- 每层专家 LRU。
- KV Cache。
- 计算工作区。
- 文件 Page Cache。
- Python API 与 Web 服务。

当我把 18GB RAM 强行固定给专家后，LRU 被压缩到每层只有一个槽位，操作系统也失去了足够的缓存空间，随后开始频繁回收和重新缺页。

最终产生了超过 154 万次 Major Fault。

所以在这种磁盘流式推理系统中，不能只看“专家命中率”。RAM 给固定专家多一点，可能同时让 Page Cache 和动态 LRU 少很多，最后整体反而更慢。

---

## **MTP 有效果吗**

模型中带有 int8 MTP Head，可以做推测解码。

原理上，它会先预测后面的 Token，再让主模型一次验证多个位置。如果草稿 Token 接受率足够高，就可能用更少的 Forward 生成更多 Token。

但是在这台机器上，MTP 没有带来速度提升：

|DRAFT|速度|Tokens/Forward|接受率|每输出 Token 专家加载量|
|---:|---:|---:|---:|---:|
|0|0.45 tok/s|1.04|—|575.0|
|1|0.38 tok/s|1.71|64%|707.7|
|3|0.21 tok/s|1.71|24%|1,392.3|

`DRAFT=1` 在这组短测中的接受率达到 64%，说明 MTP 不是完全猜不中。问题是它虽然减少了 Forward 次数，却增加了大量不同专家的读取。

在稠密模型中，验证多个位置可以重复使用同一批权重。

但是 MoE 的不同位置可能被 Router 分配给完全不同的专家。一次验证更多 Token，往往意味着需要加载更多独立专家；MTP 自己还带有一层专家路由。

所以这里出现了一个很有意思的结果：

> MTP 预测得还不错，但因为存储层太慢，预测越多反而越慢。

对这台机器，实际使用应该保持：

```bash
DRAFT=0
```

只有当大部分专家已经驻留在 RAM/VRAM，并且验证批次可以用高效 GPU Kernel 合并计算时，MTP 才更可能获得正收益。

---

## **真正的瓶颈是谁**

最佳保质量配置在 24 个输出 Token 中，大致耗时如下：

|部分|耗时|
|---|---:|
|专家磁盘服务|33.1～36.0 秒|
|专家矩阵乘|8.5～8.9 秒|
|Attention|8.6～8.8 秒|

磁盘时间明显高于专家计算和 Attention。

按专家大小和实际命中率粗略估算，即使经过 VRAM、固定 RAM 和 LRU 缓存，每个输出 Token 仍然要从磁盘读取约 4.3～4.7GB 权重。

如果目标是 3 tok/s，仅磁盘就需要提供约 13～14GB/s 的持续有效读取，而且这还完全没有给 CPU 计算和 Attention 留时间。

我的环境又有几个额外限制：

- 模型位于 QEMU SCSI 虚拟磁盘，而不是直接透传的本地 NVMe。
- CPU 只有 AVX2，没有 AVX-512/VNNI。
- 每层路由和 I/O 存在串行部分，20 个 vCPU 并不能一直全部吃满。
- 只有约 422 个专家固定在 RTX 3060 中，GPU 大部分时间等不到足够连续的工作。

换更快的 PCIe 5.0 NVMe 肯定会有帮助，但不会产生魔法。

磁盘足够快以后，瓶颈会继续转移到内存带宽、CPU 专家 Kernel 和 Attention。这个项目是在存储、内存和计算之间不断挪动瓶颈，并没有让 372GB 专家权重凭空消失。

---

## **中间还踩了三个小坑**

### **1. 控制台显示 8-bit，不代表模型真的被展开成 int8**

早期启动时会看到：

```text
experts@8-bit dense@8-bit
```

但模型文件明明是 int4，一度让我怀疑加载错了。

看代码后发现，对于已经量化的 Tensor，引擎会根据真实字节长度自动判断 int8、int4 或 int2。这里的命令行位数主要是 fallback 配置和旧的 Banner 文案，并不代表 int4 模型被重新展开成了 int8。

### **2. OpenMP 亲和性让 20 个线程全部挤在一个 CPU 上**

一次 CPU-only 测试中，我提前设置了：

```bash
OMP_PROC_BIND=spread
OMP_PLACES=cores
```

引擎随后进入自重启流程，第二个进程继承了第一个进程已经被绑定到 CPU 0 的亲和性掩码。结果虽然创建了 20 个 OpenMP Worker，实际上全都在一个 vCPU 上抢时间。

那次速度只有约 0.09 tok/s。

解决方式是显式设置：

```bash
COLI_OMP_TUNED=1
OMP_NUM_THREADS=20
OMP_PROC_BIND=spread
OMP_PLACES=cores
```

### **3. 内网 HTTP 页面不能直接使用 `crypto.randomUUID()`**

Brain Dashboard 在 `localhost` 可以正常使用，但通过内网 IP 的普通 HTTP 打开时，浏览器不会把它视为 Secure Context，`crypto.randomUUID()` 不可用。

我在本地前端加了时间戳和随机数 fallback，之后页面请求可以正常完成。Web 项目的 17 个测试也全部通过。

---

## **它和 KTransformers 有什么区别**

[KTransformers](https://github.com/kvcache-ai/ktransformers) 也经常被用来在消费级 GPU 上运行超大 MoE，但两者解决问题的方式不一样。

|维度|colibri|KTransformers|
|---|---|---|
|核心方法|按路由从磁盘读取专家|CPU/GPU 异构计算|
|主要存储层级|SSD → RAM → VRAM|大容量 DRAM → GPU|
|专家计算|冷专家通常由 CPU 计算，热门专家可进 GPU|大量专家放在主存并由优化 CPU Kernel 计算|
|优势|内存远小于模型也能启动|内存足够时速度更有实际价值|
|代价|单请求容易严重磁盘受限|通常需要数百 GB 大容量、高带宽内存|

概括一下就是：

> colibri 用 SSD 替代没有的内存；KTransformers 用大容量 RAM 替代昂贵的显存。

如果只有 RTX 3060 和几十 GB RAM，KTransformers 并不能让 372GB 专家权重消失。即使通过 mmap 勉强加载，最终也会重新落入缺页和磁盘抖动。

类似的思路还有：

- [MoE-Infinity](https://github.com/microsoft/MoE-Infinity)：预测即将使用的专家，并在 GPU、CPU、NVMe 之间预取。
- [FlexLLMGen](https://github.com/FMInference/FlexLLMGen)：通过 CPU、GPU、磁盘统一调度和大 Batch 摊薄传输成本。
- [DeepSpeed ZeRO-Inference](https://www.deepspeed.ai/tutorials/zero-inference/)：从 CPU 或 NVMe 流式传输权重，更偏批量和分布式推理。
- [AirLLM](https://github.com/lyogavin/airllm)：按层加载模型，显存占用很低，但容易被磁盘速度限制。
- [llama.cpp](https://github.com/ggml-org/llama.cpp)：通用 mmap 和 CPU/GPU Offload，模型能放进主存时非常实用，严重超过主存后同样会出现分页问题。

---

## **那么，25GB 内存跑 GLM-5.2 到底有没有实际用途**

如果“有用”的标准是：

- 可以成功加载模型。
- 可以生成正确文本。
- 可以验证 744B MoE 的路由和推理逻辑。
- 可以研究专家缓存、预取、量化、MTP 和 CPU/GPU 异构。

那它当然有用，而且工程价值很高。

但是如果标准是：

- 像正常聊天一样使用。
- 给编程助手连续生成几百到几千 Token。
- 跑 Agent 的多轮工具调用。
- 给多人提供稳定 API。

那在这台机器上基本没有实际价值。

最佳的 0.44 tok/s 意味着：

```text
100 Token：约 3.8 分钟
500 Token：约 19 分钟
```

这还没有算长 Prompt 的 Prefill 和首次响应等待。一次真实 Web 请求中，我测到的 TTFT 是 26.3 秒。

我认为交互式生成的最低门槛大约是 3 tok/s，5～8 tok/s 才开始比较实用，10～15 tok/s 才接近日常聊天体验。更不要说现在的 Agent 场景下，就是 2000 tok/s 也不限快，越快越好。

仓库 README 中的 5～15 tok/s 是硬件推演，不是小内存机器上的现成实测成绩。社区目前公开的数据中，24～32GB RAM 的机器大多只有 0.07～0.11 tok/s；部分 121～128GB 高端设备可以达到约 1～2 tok/s。

真正把全部专家放进内存和显存后，情况才发生质变。仓库记录的一台 6×RTX 5090、约 264GB RAM 的机器，在 `Disk 0` 下达到了 6.28～6.84 tok/s。

这也说明技术本身不是玩具。

---

## **最后**

我仍然很喜欢 colibri 这个项目。如果有机会，我希望我能尽快加强学习，达到能看懂推理代码的过程，我现在对深度学习还是一无所知，买的花书也是吃灰数年，总是推脱自己太忙也不是长久的理由。

贴一下真实效果的 GIF

![实测效果](https://imgbed.anluoying.com/2026/07/a4e2ce1eec958d6e79fa4a15861c5d32.gif)

---

## **相关资料**

- [JustVugg/colibri](https://github.com/JustVugg/colibri)
- [GLM-5.2 on 6×RTX 5090 实验记录](https://github.com/JustVugg/colibri/blob/main/docs/experiments/glm52-6x5090-2026-07-12.md)
- [KTransformers](https://github.com/kvcache-ai/ktransformers)

