---
title: "八张 RTX 3090 本地部署 DeepSeek-V4-Flash：32K、64K、128K 实测"
description: "使用 llama.cpp 和 UD-Q4_K_XL GGUF 将 DeepSeek-V4-Flash-0731 部署到八张 RTX 3090，记录显存占用、长上下文性能、KV Cache 与 OpenCode 实测。"
date: 2026-08-05T22:11:44+08:00
license: Licensed under CC BY-NC-SA 4.0
hidden: false
comments: true
draft: false
lastmod: 2026-08-05T23:32:31+08:00
showLastMod: true
tags:
  - DeepSeek-V4-Flash
  - llama.cpp
  - RTX 3090
  - GGUF
  - OpenCode
categories:
  - 杂技浅尝
---

前两天还在纸面上计算 DeepSeek-V4-Flash 本地部署需要多少硬件，这次不继续算账了，直接上机器。

我最快能调动的本地算力就是八张 RTX 3090。为了腾显存，还把其中四张卡上常驻的 Qwen3.6-27B 服务停了。模型前一天晚上就开始下载，结果中途网络断掉，第二天又重新来了一遍。百兆网拉一百多 GB 的模型，确实很磨人。

这次想确认两个问题：**八张 RTX 3090 能不能把 DeepSeek-V4-Flash 完整放进显存，以及跑起来后的真实 Coding Agent 体验怎么样。**

先放结果：

> 八卡 3090 能跑，而且不是 0.x tok/s 的“亮机测试”。32K 长上下文下，单路解码约 32 tok/s；如果 Coding Agent 的历史上下文能命中 KV Cache，32K 请求的 TTFT 可以从约 70 秒降到 8.38 秒。

## 这次部署的模型与配置

模型使用 `DeepSeek-V4-Flash-0731` 的 Unsloth 量化版本 `UD-Q4_K_XL` GGUF：

- 模型总参数约 284B，每个 Token 激活约 13B。
- 五个 GGUF 分片合计 155,095,241,120 字节，约 144.44 GiB。
- 八张 RTX 3090 合计提供 192 GiB 显存。
- 推理框架使用 llama.cpp，多卡采用 layer split。
- 首轮配置为 32K 上下文、单 slot、Flash Attention、Q8 KV Cache。

我选这个量化版本，最直接的原因是它能完整装进八卡 3090。Unsloth 模型卡还提到，`UD-Q8_K_XL` 为 162GB，只比 `UD-Q4_K_XL` 大约 7GB。不过我没有在同一环境里做 Q4 与 Q8 的能力 A/B，所以这篇只记录 Q4 的运行情况，不把“能力几乎无损”当成自己的实测结论。

这也不是追求高并发 API 服务的配置。我的目标是离线内网 Coding Agent：一到两个用户，长上下文，源码和日志不离开内网。

## 下载 DeepSeek-V4-Flash GGUF

模型来自 Hugging Face。我的代理流量已经不太够，只能走 `hf-mirror`：

```bash
export HF_ENDPOINT=https://hf-mirror.com

hf download unsloth/DeepSeek-V4-Flash-0731-GGUF \
  --include 'UD-Q4_K_XL/*' \
  --local-dir /data/huggingface_model/DeepSeek-V4-Flash-0731-UD-Q4_K_XL
```

![通过 hf-mirror 下载 DeepSeek-V4-Flash GGUF 分片|300](https://imgbed.anluoying.com/2026/08/7ed429f105e288a88baaf8fad03a5b4c.jpg)

下载速度并不稳定，几个大分片只有每秒几 MB。下载结束后，先确认五个分片完整，再启动服务。

## llama.cpp 加载 155GB 模型花了多久

下面保存的是后来测试 128K 上下文时使用的启动命令。首次测试 32K 时，只需要把 `--ctx-size 131072` 改成 `32768`：

```bash
CUDA_DEVICE_ORDER=PCI_BUS_ID \
CUDA_VISIBLE_DEVICES=0,1,2,3,4,5,6,7 \
./llama-server \
  --model /data/huggingface_model/DeepSeek-V4-Flash-0731-UD-Q4_K_XL/UD-Q4_K_XL/DeepSeek-V4-Flash-0731-UD-Q4_K_XL-00001-of-00005.gguf \
  --alias DeepSeek-V4-Flash-0731-UD-Q4_K_XL \
  --host 0.0.0.0 \
  --port 8099 \
  --api-key "请替换为自己的API_KEY" \
  --ctx-size 131072 \
  --parallel 1 \
  --threads 16 \
  --threads-batch 32 \
  --batch-size 2048 \
  --ubatch-size 512 \
  --gpu-layers 999 \
  --split-mode layer \
  --tensor-split 1,1,1,1,1,1,1,1 \
  --flash-attn on \
  --cache-type-k q8_0 \
  --cache-type-v q8_0 \
  --numa distribute \
  --load-mode mmap \
  --temp 1.0 \
  --top-p 0.95 \
  --min-p 0.0 \
  --reasoning auto \
  --cont-batching \
  --metrics \
  --slots \
  --no-ui
```

几个需要按实际环境调整的地方：

- `--model` 只指向第一个 GGUF 分片，llama.cpp 会自动加载其余四个分片。
- 如果只允许本机访问，把 `--host 0.0.0.0` 改成 `127.0.0.1`；不对外提供接口时也可以移除 `--api-key`。
- `--tensor-split` 的八个数字对应八张 GPU，卡数不同必须调整。
- `--threads` 和 `--threads-batch` 应根据机器的 CPU 数量调整。
- 这条命令没有启用 DSpark，对应的也是本文现有的全部实测数据。

![llama.cpp 加载 DeepSeek-V4-Flash 时出现磁盘读取瓶颈|300](https://imgbed.anluoying.com/2026/08/af796d87a0b9875ed240102c378ddaf2.png)

启动日志曾经停在这里五分钟：

```text
load_model: loading model '...00001-of-00005.gguf'
```

看起来很像卡死。我检查资源占用后发现，磁盘还在以约 40MB/s 持续读取。可能和 VMware 或磁盘有关，具体原因我没有继续确认。把 155GB 权重搬到八张卡上，最终用了约 **46 分 51 秒**。

## 八张卡的显存为什么没有占到同一个比例

模型加载后，八张卡的显存占用并不整齐，大约分布在 15～21GB，最高的卡接近 88%，最低的约 62%。

![DeepSeek-V4-Flash 加载后八张 RTX 3090 显存占用不均|300](https://imgbed.anluoying.com/2026/08/e1ebae34cf4f8ccbc932f8110be6ab9a.png)

这和 vLLM 的体验很不一样。vLLM 设置 `gpu_memory_utilization=0.9` 后，会把权重之外的大量显存提前规划成 KV Cache 块，让整卡占用主动接近 90%。llama.cpp 则根据权重切分、计算缓冲、上下文长度和 KV 精度按需分配，不追求固定百分比。

所以显存没有全部占满，不代表部署不完整；各张卡的剩余显存也不能直接相加。是否还能继续增加上下文，最终取决于占用最高的那张卡。

![llama.cpp 多卡 layer split 下的显存分配情况|300](https://imgbed.anluoying.com/2026/08/7359d687fb15a273e0e72d33d4fc1dd4.png)

## OpenAI 兼容接口已经可以正常使用

llama.cpp 暴露了 OpenAI 兼容接口，模型 ID 为：

```text
DeepSeek-V4-Flash-0731-UD-Q4_K_XL
```

健康检查、模型列表和短对话都能正常返回。我先把它接进 Open WebUI 做了基础检查。

![Open WebUI 成功调用本地 DeepSeek-V4-Flash 服务|300](https://imgbed.anluoying.com/2026/08/8fbb7421e03591139191cc5251770363.png)

短问题当然说明不了什么。Coding Agent 的输入不是几十个 Token，系统提示、工具定义、代码、终端日志和历史对话叠在一起，6K 只是起步，16K 很常见，30K 也不夸张。

## 32K 单路：真实代码上下文能跑多快

以下是在这台服务器上的实测数据。输入不是重复字符，而是从 llama.cpp 源码中截取的真实 C/C++ 文件；每组都是冷请求，关闭前缀缓存，固定最多生成 512 Token。

| 输入上下文 | 冷预填充 | TTFT | 解码速度 | 总耗时 |
|---:|---:|---:|---:|---:|
| 6K | 503 tok/s | 12.3 秒 | 35.8 tok/s | 26.6 秒 |
| 16K | 498 tok/s | 32.4 秒 | 34.9 tok/s | 47.0 秒 |
| 30K | 464 tok/s | 65.0 秒 | 32.2 tok/s | 80.9 秒 |
| 32K | 461 tok/s | 70.0 秒 | 32.1 tok/s | 85.9 秒 |

注意看 TTFT，也就是提交请求到看到第一个 Token 的时间。32K 冷请求要等约 70 秒，确实难绷。好在 Coding Agent 往往会重复使用大段相同前缀，KV Cache 正好能缓解这个问题。

## KV Cache 才接近 Coding Agent 的真实体验

OpenCode 一类 Agent 会反复携带相同的系统提示、工具定义、仓库源码和历史消息，新一轮通常只在末尾追加少量命令输出、补丁和用户任务。

我模拟了这种“历史不变、末尾追加”的会话：先把 90% 的稳定上下文放进 slot，再追加最后 10%，测试 KV Cache 命中后的 TTFT。

| 总上下文 | 缓存命中 | 本轮新增预填充 | 冷 TTFT | 热 TTFT | 有效预填充速度 |
|---:|---:|---:|---:|---:|---:|
| 6K | 5,400 Token | 604 Token | 12.3 秒 | 1.48 秒 | 4,141 tok/s |
| 16K | 14,400 Token | 1,604 Token | 32.4 秒 | 3.70 秒 | 4,430 tok/s |
| 30K | 27,000 Token | 3,004 Token | 65.0 秒 | 7.49 秒 | 4,089 tok/s |
| 32K | 28,800 Token | 3,204 Token | 70.0 秒 | 8.38 秒 | 3,883 tok/s |

这里的“有效预填充速度”不是 GPU 突然快了十倍，而是九成 Token 根本不需要重新计算。新增 Token 的物理预填充速度仍在约 389～444 tok/s。

如果命中率更高，效果还会更明显。16K 上下文命中 96.7% 时，只需要重新处理 526 Token，TTFT 约 1.47 秒，完整上下文折算的有效预填充超过 1.1 万 tok/s。

缓存也有前提。如果每轮都重新排序工具定义、在提示词开头插入时间戳，或者改写较早位置的内容，前缀匹配被破坏，就可能重新退化成完整预填充。开发 Agent 或调用带缓存计费的 API 时，稳定前缀都很重要。

## 接入 OpenCode 的实际效果

同事把这个 OpenAI 兼容接口接进了 OpenCode，实际用下来不错。和单条 API Benchmark 不一样，Agent 会连续读取文件、调用工具、执行命令，再把新结果追加回上下文，这种用法正好能吃到 KV Cache 的好处。

OpenCode 本身我之前也写过一篇[初次使用记录](/posts/opencode-初体验/)，这里主要看它接入本地 DeepSeek-V4-Flash 后的表现。

![OpenCode 接入本地 DeepSeek-V4-Flash 服务|300](https://imgbed.anluoying.com/2026/08/1d109df7606f87579febb106e392b18e.png)

![OpenCode 使用 DeepSeek-V4-Flash 完成实际 Coding Agent 任务](https://imgbed.anluoying.com/2026/08/100ee302c6be169d48b04bbb8d29c615.gif)

## 64K 和 128K 上下文实测

32K 跑通后，我把服务配置改成：

```text
CONTEXT_SIZE=131072
PARALLEL=1
```

这样只需要重新加载一次模型，就可以同时测试 64K 和接近 128K 的单请求，不必为了两个上下文档位重复等待几十分钟。

第二次重载约 35 分钟后，服务成功启动：

```text
n_ctx = 131072
n_ctx_train = 1048576
```

128K Q8 KV Cache 没有吃掉想象中那么多显存。服务空闲时，八张卡约占 15.4～21.7GiB；128K 冷请求运行期间，最高的一张卡峰值约 22.06GiB，没有 OOM。

最终数据如下：

| 总上下文 | 冷预填充 | 冷 TTFT | 90% 缓存 TTFT | 解码速度 | 有效预填充速度 |
|---:|---:|---:|---:|---:|---:|
| 32K | 461 tok/s | 70.0 秒 | 8.38 秒 | 32.1 tok/s | 3,883 tok/s |
| 64K | 398 tok/s | 160.95 秒 | 20.49 秒 | 28.48 tok/s | 3,162 tok/s |
| 128K | 310 tok/s | 413.8 秒 | 58.69 秒 | 24.38 tok/s | 2,202 tok/s |

128K 确实能跑，但不适合每轮冷启动：第一次打开上下文，要等接近 7 分钟。即使命中 90% 缓存，本轮新增的 12.8K Token 本身也已经是一条不短的请求，所以 TTFT 仍接近一分钟。

64K 更像日常 Coding Agent 的平衡点。它能容纳较大的仓库上下文，缓存命中后的 TTFT 约 20 秒，单路生成仍接近 28.5 tok/s。128K 则适合大型仓库分析、超长日志和少数深度任务，作为极限档按需使用。

## 其他硬件数据只能作为数量级参照

凑巧朋友圈里有一份其他玩家整理的测试：2×H20 热身后单路约 108.7 tok/s，6×RTX 5090 单路约 102～103 tok/s、八路总吞吐约 427～450 tok/s，2×RTX PRO 6000 约 93～95 tok/s，2×DGX Spark 稳态约 70.1 tok/s。

![网友提供的 DeepSeek-V4-Flash 多种硬件测试汇总](https://imgbed.anluoying.com/2026/08/6181ab5ef04f37955c6f8c7a370ad1cf.png)

这些数据只能作为数量级参照。截图没有给出完全统一的量化版本、推理框架、预热方式、上下文长度和 Decode 统计口径；其中 H20 冷启动只有 28.1 tok/s，热身后却达到 108.7 tok/s，也再次说明测试本地大模型时必须区分冷启动、热缓存和稳态数据。

至少从这份数据可以看到，更强的新卡和更好的互联有机会把单路速度推到 70～100 tok/s 以上。八卡 3090 这套方案追求的则是用手头现有的消费级多卡容纳完整模型，换到 24～32 tok/s 的可用 Coding Agent 体验。

## 八卡 RTX 3090 部署的最终结论

八张 RTX 3090 部署 DeepSeek-V4-Flash，不是适合卖高并发 Token 的方案。它的优势很明确：

- 155GB 量化权重可以完整驻留八卡显存。
- 32K、64K、128K 均已实测通过，单路生成分别约 32.1、28.5、24.4 tok/s。
- 命中 90% KV Cache 后，64K TTFT 约 20.5 秒，128K 约 58.7 秒。
- 源码、日志、工具权限和完整工作流都可以留在内网。

缺点也同样明确：消费级多卡缺少高速互联，并发能力有限，提示词和缓存策略需要认真设计。

这台测试服务器的 CPU 和内存都比较旧，显卡之间也没有高速互联，都会拖累性能，所以这些数据只能代表当前这套环境。如果目标不是服务几百个人，而是给个人或小团队准备一个离线 Coding Agent，八卡 3090 已经不只是“为了证明能跑”，是真的可以拿来工作。

官方原始权重和 DSpark 小模型我也已经开始下载，但还没有完成同环境测试。后面准备试试投机解码能不能继续加速，也争取补一轮 2×RTX PRO 6000 的实测。

先这样，等后续数据跑出来再更新。

## 参考资料

- [DeepSeek-V4-Flash-0731 官方模型卡](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731)
- [Unsloth DeepSeek-V4-Flash-0731 GGUF](https://huggingface.co/unsloth/DeepSeek-V4-Flash-0731-GGUF)
- [llama.cpp DeepSeek V4 支持 PR](https://github.com/ggml-org/llama.cpp/pull/24162)
- [llama.cpp Server 文档](https://github.com/ggml-org/llama.cpp/tree/master/tools/server)
