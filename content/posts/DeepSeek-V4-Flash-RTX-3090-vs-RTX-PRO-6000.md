---
title: "DeepSeek-V4-Flash 实测：八卡 RTX 3090 与双卡 RTX PRO 6000 差多少？"
description: "对比八张 RTX 3090 与两张 RTX PRO 6000 部署 DeepSeek-V4-Flash 的 DSpark、Prefill、Decode 和并发表现，并整理不同预算下的硬件选择边界。"
date: 2026-08-08T01:53:57+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-08-08T02:18:28+08:00
showLastMod: true
tags:
  - DeepSeek-V4-Flash
  - DSpark
  - RTX 3090
  - RTX PRO 6000
  - vLLM
  - llama.cpp
categories:
  - 杂技浅尝
---

上一篇我把 DeepSeek-V4-Flash 塞进了[八张 RTX 3090](/posts/deepseek-v4-flash-8x-rtx-3090/)，结尾留下两件事：给 3090 测 DSpark 投机解码，再找两张 RTX PRO 6000 跑官方权重。

现在两个坑都填上了。

结果比我预想得更夸张：

- 八卡 RTX 3090 把 DSpark 参数调对后，固定长输出的单路 Decode 从约 36 tok/s 提升到 61.26 tok/s。
- 双卡 RTX PRO 6000 的最快方案跑到了约 204 tok/s，长输入 Prefill 也稳定在约 3K tok/s。

不过先说清楚：这不是一场严格控制变量的 GPU 跑分。两边使用的权重、推理引擎、DSpark 配置和虚拟化环境都不同。本文比较的是**我实际能部署出来的两套方案**，不是单纯比较 RTX 3090 和 RTX PRO 6000 的理论算力。

![八卡 RTX 3090 机架与双卡 RTX PRO 6000 工作站对比插图|300](https://imgbed.szmckj.cn/uploads/2026/08/08/6a76180a432b4.png)

## 两套 DeepSeek-V4-Flash 环境有什么不同

| 项目 | 8× RTX 3090 | 2× RTX PRO 6000 |
|---|---|---|
| 单卡显存 | 24GiB | 96GiB |
| 总显存 | 192GiB | 192GiB |
| 模型 | Unsloth `UD-Q4_K_XL` GGUF | DeepSeek 官方权重 |
| 推理引擎 | llama.cpp | 定制 vLLM r24 |
| DSpark | Q8_0 Draft，`n_max=3` | DSpark K5 |
| 多卡方式 | 8 卡 layer split | TP2 |
| 环境限制 | VMware、无 NVLink/P2P、CPU 与内存较旧 | VMware、P2P 和 custom all-reduce 被禁用 |

3090 侧的正式 DSpark 测试使用 NVIDIA 595.84、CUDA 13.2 和 llama.cpp commit `6ea215d171fd31df943bf1ac8227129f2b963160`。PRO 6000 侧则使用 InstantTensor、B12X Attention/MoE/Linear、FP8 KV Cache 和 CUDA Graph。

所以后面的数字只能在各自环境中理解。它们适合回答“这两套现有机器实际能做到什么”，不能直接外推成所有 3090 和 PRO 6000 的通用成绩。

## 八卡 RTX 3090：DSpark 参数调对后确实能加速

我最开始并不确定，这套只有 PCIe 互联的八卡 3090 开启投机解码后是否真的会更快。

第一次直接按较长的草稿块，把 DSpark 的 `n_max` 设成 5，确实有提升，但还不是最优解。后来按 Unsloth 推荐改成 `n_max=3`，结果一下子拉开了。

固定 6,000 Token 代码输入、强制生成 2,048 Token、关闭提前停止，每个配置跑三次，取中位数：

| 配置 | Prefill | Decode | DSpark 接受率 | 整轮耗时 |
|---|---:|---:|---:|---:|
| Target-only | 539.43 tok/s | 36.09 tok/s | — | — |
| DSpark `n_max=5` | 517.34 tok/s | 49.67 tok/s | 75.99% | 53.12 秒 |
| DSpark `n_max=3` | 505.51 tok/s | 61.26 tok/s | 91.46% | 45.34 秒 |

`n_max=3` 比 `n_max=5` 的 Decode 快 23.3%，整轮任务快 14.6%。草稿猜得越长，靠后的 Token 越容易被拒绝；验证这些没用上的 Token 时，主模型、草稿模型和八张卡之间都要多忙一轮。

在这套没有 NVLink、没有 P2P 的八卡 PCIe 环境里，猜三步反而比猜五步更合适。

![Unsloth 推荐 DeepSeek-V4-Flash 使用 DSpark n_max=3 的加速图表|300](https://imgbed.szmckj.cn/uploads/2026/08/08/6a761310e5eb6.png)

不过 DSpark 不是打开以后所有任务都自动加速。之前测试 512 Token 的短输出时，它有时只快几个百分点，甚至还会倒退。

目前我的判断是：

- 长代码、长报告、长思考输出，DSpark 值得开。
- 短问答不一定赚，Prefill 还可能更慢。
- 真要用于 Coding Agent，上线前必须跑任务级质量回归，不能只看 tok/s。

## antirez/ds4 没跑起来，还差点把服务器拖死

社区里还有一条很诱人的路线：`antirez/ds4` CUDA Tensor Parallel。

源码在 3090 的 `sm_86` 上编译成功，专用 Q4 权重也完成了八卡 placement。然后它检查出所有 GPU 配对都只能走 `BOUNCE`，跨卡数据要经过主机内存中转，接着开始对约 154GiB 的 GGUF 做整文件 `cudaHostRegister()`。

出去摸个鱼回来，权重还没开始复制，CPU 和 CUDA/IOMMU 的压力已经把 SSH 拖断了。

到这里就没必要继续硬撑。这条路线更依赖裸机、正常 P2P 和更好的 PCIe 拓扑，不适合我这台 VMware 八卡机。本次没有拿到可报告的 `antirez/ds4` 推理吞吐。

## 八卡 3090 的并发瓶颈不在显存

单路跑快以后，我把总上下文设成 128K，切成 12 个 slot，测试 1、2、4、8、12 并发。

需要注意：**这不是 12 路请求每路都有 128K。** 服务对齐后总容量是 132,096 Token，每个 slot 实际 11,008 Token；测试请求为每路 8K 输入、512 输出。

| 并发 | 每流 Decode 中位数 | 聚合整轮吞吐 | 单轮总耗时 |
|---:|---:|---:|---:|
| 1 | 40.54 tok/s | 18.01 tok/s | 28.42 秒 |
| 2 | 25.30 tok/s | 20.01 tok/s | 51.17 秒 |
| 4 | 13.67 tok/s | 22.29 tok/s | 91.90 秒 |
| 8 | 5.92 tok/s | 23.47 tok/s | 174.56 秒 |
| 12 | 3.82 tok/s | 24.15 tok/s | 254.42 秒 |

聚合吞吐一直在涨，但并发 8 比并发 4 只增加约 5.3%，并发 12 比并发 8 只增加约 2.9%。与此同时，单路 Decode 已经从 40.5 tok/s 掉到 3.8 tok/s。

瓶颈并不是显存容量。单卡峰值约 22,216MiB，八卡平均 GPU 利用率只有约 10.7%～11.7%。日志显示多路 Prefill 基本按 slot 分段推进，后面的请求一直排队。

所以这台八卡机的实用档位很明确：

- Coding Agent：并发 1，最多 2。
- 可以等待的文档批处理：并发 4。
- 并发 8～12：容量上能跑，交互体验没什么意义。

## 双卡 RTX PRO 6000：硬件省心，虚拟机不省心

接着换成两张 96GB 的 RTX PRO 6000 Blackwell Workstation Edition。两张卡同样提供 192GB 标称显存，这次使用 DeepSeek 官方权重，按理说很适合做 TP2。

结果一上来就撞墙。

这两张卡在裸机和 CUDA 层面支持 PCIe P2P，但一打开 P2P，虚拟机就会崩。我没有查清具体原因。换 vLLM 默认的 B12X fused all-reduce 后，模型可以加载，服务却一直挂着，8080 端口始终不监听。

最后能稳定运行的组合反而是：

```text
TP2
NCCL P2P disabled
custom all-reduce disabled
NCCL / SHM 通信
InstantTensor 加载
B12X attention / MoE / linear
DSpark K5
CUDA Graph FULL_AND_PIECEWISE
```

每张卡加载约 81.01GiB 权重，权重读取约 302 秒，Engine 初始化 354.85 秒，从启动到服务可用大约 11～12 分钟。

## RTX PRO 6000 的 Prefill 与首次 JIT

启动阶段的 warmup 没有覆盖所有 Prefill、并发和 DSpark 形状。每遇到一种没见过的 shape/config，SparkInfer、CuTeDSL 或 Triton 还可能现场 JIT 一次。

我使用没有缓存命中的真实 SGLang 代码复测。这里的 Prefill 速度按 `Prompt Token / TTFT` 折算，包含请求调度和首 Token 返回，不是单独的 CUDA Kernel 成绩：

| 实际输入 | TTFT | Prompt / TTFT |
|---:|---:|---:|
| 约 17K | 5.52～5.67 秒 | 3,057～3,088 tok/s |
| 23,099 Token | 7.28 秒 | 3,173 tok/s |
| 28K～32.7K | 9.26～10.92 秒 | 2,997～3,080 tok/s |

实际体验是前面安静五六秒，随后突然开始快速输出代码，反差很明显。

新 shape 的首次 JIT 还会再慢一刀：同样约 17.5K 输入，第一次请求总耗时约 8.76 秒，预热后 TTFT 稳定到约 5.7 秒。正式上线前，最好主动跑一组覆盖常用并发、上下文和长输出的 warmup。

![双卡 RTX PRO 6000 处理长输入后以约 204 tok/s 解码的阶段示意|300](https://imgbed.szmckj.cn/uploads/2026/08/08/6a7617ffad4e5.png)

## 双卡 RTX PRO 6000 的 204 tok/s 从哪里来

当前最快的组合是定制 vLLM r24、官方权重与 DSpark K5。在 16K 输入、512 输出的请求里，DSpark 平均接受长度为 3.65，Draft 接受率约 53%。每轮最多猜 5 个 Token，实际平均能让主模型前进三到四步，已经足够明显地提高单流 Decode。

这里有个容易误解的地方：不是只有这版定制 vLLM 才包含 DSpark。之前用原版 vLLM 跑出过一次约 6.1 tok/s，源码里已经注册了 DeepSeek-V4 的 DSpark，只是启动参数没有打开，当时跑的仍然是 target-only，并且使用了通用 FlashInfer、Eager 和更保守的通信路径。

定制版补上的也不只是 DSpark 开关，还包括：

- InstantTensor Loader。
- B12X MLA Sparse Attention。
- B12X MoE 与 Linear。
- SparkInfer/CuTeDSL 的 SM120 专用算子。
- FP8 KV Cache。
- 完整和分段 CUDA Graph。

DSpark 减少昂贵的主模型前向次数，B12X 和 SparkInfer 则让每次前向本身更快。它们叠在一起，才是当前约 204 tok/s 的来源。

社区里有人使用双 RTX PRO 6000、定制 vLLM、InstantTensor 和 B12X 后端跑到约 122 tok/s，但公开记录没有给出统一的 Prompt、输出长度和实际上下文占用，所以只能当作复现线索，不能和本文数字直接横比。

## 为什么 SGLang 没有跑出相同的 DSpark 结果

SGLang 的 target-only 基线其实不差：单路约 70 tok/s，8 并发全部进入 Decode 后，聚合约 332～340 tok/s。

但我当前环境里的 DSpark 没有跑通。Draft 与 Verify 一次只处理 5～40 个 Token，SM120 后端却把它们送进了要求 Token 数大于 64 的 Attention Kernel；即使关闭 CUDA Graph，仍然报同类错误。

这个结论只针对我当时准备的镜像和版本。网络条件有限，我没来得及下载更新镜像继续排查，不能据此泛化成“SGLang 不支持 DeepSeek-V4 DSpark”。

目前能确定的是：**定制 vLLM + DSpark，是我在这两张 RTX PRO 6000 上跑出来的最快单路方案。**

## 接到实际任务里是什么感觉

跑分归跑分，最后还是得让它干点实际的。我把服务接到上游，让它现场做了一个天气卡片。

速度确实舒服，基本没有“模型还在慢慢打字，我先去刷会儿手机”的感觉。

![本地 DeepSeek-V4-Flash 生成的明暗主题天气卡片效果](https://imgbed.szmckj.cn/uploads/2026/08/08/6a761167191dd.gif)

自己部署的 DeepSeek 和官方 API 在效果上仍有差异。我目前只是猜测可能与系统提示词或部署模式有关，时间有限，还没有完成严格对照。这轮先确认了可行性，质量差异以后再查。

## 不同预算下怎么选本地 DeepSeek 硬件

上一篇已经整理过 H20、RTX 5090、RTX PRO 6000 和 DGX Spark 的其他玩家成绩，这次不再重复硬件排行榜。结合这几天的实测和社区里配置相对完整的案例，我目前会这样选。

### 已经有 RTX 3090：继续用，不必为了跑分换卡

八张 3090 已经在手里的话，`Unsloth GGUF + llama.cpp + DSpark n_max=3` 可以继续用。它不适合高并发 Token 服务，但跑一两个离线 Coding Agent、做可以排队的文档处理，依然很实用。

社区还有一条“旧服务器再就业”路线：四路 Xeon、768GB DDR4，只配两张 3090，通过 CPU 内存与 GPU 混合加载官方 156GB 权重，单路约 33 tok/s，四到八并发聚合约 53～68 tok/s。

这证明显卡数量不是唯一答案，内存通道足够多的旧服务器也能运行 DeepSeek。不过如果手里没有这类机器，我不建议专门照着买。四路服务器的功耗、噪音、内存和 NUMA 调优，最后可能比模型本身还折腾。

### 单台 DGX Spark：适合体验和个人 Agent

单台 DGX Spark 是体积较小、门槛较低的整机路线之一。截至 2026 年 8 月，国内公开渠道的 128GB/4TB 版本约 3.5 万元。

社区使用 `UD-IQ2_M + llama.cpp` 跑出约 19.7 tok/s 单流、约 52 tok/s 四并发；换更激进的专用引擎后，短上下文单流可以达到约 28～30 tok/s，也有人尝试过 1M Context。

代价也很明显：单机主要依靠 IQ2/IQ3 量化，不能等同于双机部署的官方权重；多个 Agent 同时携带长历史时，吞吐会快速下降。它更适合体验、个人 Agent 和长上下文实验。

### 双 DGX Spark：兼顾官方权重和超长上下文

如果从零购买，又希望运行官方 DeepSeek-V4-Flash-0731，我目前更倾向两台 DGX Spark。

截至 2026 年 8 月，国内公开零售价两台约 7 万元，社区讨论中也出现过 5.5～6.7 万元的阶段性价格。社区已经有相对完整的 TP2 配方：官方权重、200Gb RoCE、DSpark K5、NVFP4 KV、CUDA Graph、Prefix Cache 和 Chunked Prefill。

调好 CUDA Graph 后，公开结果中的单路热 Decode 中位数约 95.9 tok/s，双并发聚合约 151.8 tok/s，四并发约 263.7 tok/s，六并发约 340.5 tok/s。还有人提交了约 90 万 Token 的真实请求并成功返回。

不过，“能开 1M”和“1M 好用”不是一回事。那次约 90 万 Token 请求的 TTFT 是 1028.85 秒，差不多等了 17 分钟才看到第一个 Token。它适合偶尔吞下超大代码库或文档库，不代表日常任务应该把上下文拉满。

双 Spark 也不是插上电就自动得到这些数字。两台机器需要正确的 ConnectX-7/200Gb RoCE 互联，NCCL、容器镜像、CUDA Graph 和 DSpark Loader 都要配对。社区还发现过 Loader 漏载 12 个 Shared Expert Tensor 的问题；修复后，平均吞吐才从 32.7 tok/s 恢复到 55.4 tok/s，DSpark 接受率从 25.7% 回到 60.2%。

### 双 RTX PRO 6000：价格高，但单机等待时间更短

如果更在意单机部署、Prefill、低延迟和单路 Coding Agent 体验，双 RTX PRO 6000 确实更舒服。本文这套甚至被 VMware 禁掉了 P2P 和 custom all-reduce，仍然跑到约 204 tok/s；换成裸机和更合理的 PCIe 拓扑，理论上还有提升空间，但我没有实测，不替它吹。

问题还是价格。截至 2026 年 8 月，RTX PRO 6000 Blackwell 96GB 在国内公开渠道常见报价接近 10～12 万元一张，双卡仅显卡约 20～24 万元，还没计算工作站成本。

它买到的是更高的单路速度、单机维护便利和更少的等待，不是单纯的“每元 tok/s”。

## 我现在的选择

- 手里已经有 3090：继续榨，不必为了跑分焦虑。
- 预算三万多：单台 DGX Spark 可以体验，但要接受量化和速度边界。
- 预算约 5.5～7 万：想跑官方权重和超长上下文，双 DGX Spark 是目前较完整的性价比路线。
- 预算二十万以上：优先单机速度和服务体验，双 RTX PRO 6000 更合适。

至于我自己，先继续用手头能调动的设备。等哪天能借到两台 DGX Spark，再折腾一轮。

## 参考资料

- [上一篇：八张 RTX 3090 本地部署 DeepSeek-V4-Flash](/posts/deepseek-v4-flash-8x-rtx-3090/)
- [DeepSeek-V4-Flash-0731 官方模型卡](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731)
- [Unsloth DeepSeek-V4 部署与 DSpark 说明](https://unsloth.ai/docs/models/deepseek-v4)
- [Reddit：双 RTX PRO 6000 的定制 vLLM / B12X 案例](https://www.reddit.com/r/LocalLLaMA/comments/1vc0yvs/minimum_vram_gpu_to_run_deepseekv4flash0731_q4_k/)
- [NVIDIA 论坛：双 RTX PRO 6000 运行 DeepSeek-V4-Flash](https://forums.developer.nvidia.com/t/running-deepseek-v4-flash-0731-on-dual-nvidia-rtx-pro-6000-blackwell-gpus/378908)
- [Reddit：双 RTX 3090 与四路 Xeon 运行官方权重](https://www.reddit.com/r/LocalLLaMA/comments/1veow4b/deepseek_v4flash_284b_moe_at_33_toks_single_68/)
- [NVIDIA 论坛：单 DGX Spark 的 131K Context 实测](https://forums.developer.nvidia.com/t/1x-dgx-spark-deepseek-v4-flash-0731-on-llama-cpp-131k-ctx-slot-19-7-tok-s-single-stream-52-tok-s-4-concurrent/379129)
- [MiaAI-Lab：双 DGX Spark 与 DSpark 完整部署配方](https://github.com/MiaAI-Lab/DeepSeek-v4-Flash-DSpark-2x-DGX-Spark)
- [NVIDIA 论坛：双 DGX Spark 的 DSpark Loader 修复与 1M Context](https://forums.developer.nvidia.com/t/deepseek-v4-flash-0731-dspark-1m-nvfp4-kv-2x-dgx-spark/378824)
- [什么值得买：DGX Spark 128GB/4TB 国内公开价格线索](https://www.smzdm.com/p/172698070/)
- [Linux.do：DeepSeek-V4-Flash 本地部署与国内价格讨论](https://linux.do/t/topic/2685835)
